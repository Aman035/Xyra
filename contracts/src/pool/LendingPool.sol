// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../protocol/PoolConfigurationProvider.sol";
import "../interfaces/ILendingPool.sol";
import "../vaults/ERC4626Reserve.sol";
import "../interestBearingToken/xERC20.sol";

contract LendingPool is
    ILendingPool,
    PoolConfigurationProvider,
    ReentrancyGuard
{
    using SafeERC20 for IERC20;

    IPoolManager public poolManager;
    IPriceOracle public priceOracle;
    ICollateralManager public collateralManager;
    IInterestRateModel public interestRateModel;

    /// @dev user => asset => shares deposited in the vault
    mapping(address => mapping(address => uint256)) internal userShares;

    /// @dev user => asset => debt amount
    mapping(address => mapping(address => uint256)) internal userDebt;

    event Supplied(
        address indexed asset,
        address indexed user,
        address indexed onBehalfOf,
        uint256 amount
    );
    event Withdrawn(
        address indexed asset,
        address indexed user,
        address indexed to,
        uint256 amount
    );
    event Borrowed(
        address indexed asset,
        address indexed user,
        address indexed onBehalfOf,
        uint256 amount
    );
    event Repaid(
        address indexed asset,
        address indexed user,
        address indexed repayer,
        uint256 amount
    );

    constructor(
        address _acm,
        address _poolManager,
        address _interestRateModel,
        address _priceOracle,
        address _collateralManager
    )
        PoolConfigurationProvider(
            _acm,
            _poolManager,
            _interestRateModel,
            _priceOracle,
            _collateralManager
        )
    {
        poolManager = IPoolManager(_poolManager);
        priceOracle = IPriceOracle(_priceOracle);
        collateralManager = ICollateralManager(_collateralManager);
        interestRateModel = IInterestRateModel(_interestRateModel);
    }

    function supply(
        address asset,
        uint256 amount,
        address onBehalfOf
    ) external override nonReentrant {
        uint8 assetDecimals = ERC20(asset).decimals();
        uint256 scaledAmount = (amount * 1e18) / (10 ** assetDecimals);

        require(scaledAmount > 0, "LendingPool: amount 0");

        address vaultAddr = poolManager.getVault(asset);
        address xTokenAddr = poolManager.getAssetToXToken(asset);
        require(vaultAddr != address(0), "LendingPool: unsupported asset");
        require(xTokenAddr != address(0), "LendingPool: xToken not deployed");

        // Transfer the underlying asset from sender to pool
        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);

        // Mint equivalent xERC20 tokens to this lending pool contract
        xERC20(xTokenAddr).mint(address(this), scaledAmount);

        // Approve vault to spend xERC20 tokens
        IERC20(xTokenAddr).approve(vaultAddr, scaledAmount);

        // Deposit xERC20 tokens into the vault, receive shares
        uint256 shares = ERC4626Reserve(vaultAddr).deposit(
            scaledAmount,
            address(this)
        );

        // Update user shares mapping
        userShares[onBehalfOf][asset] += shares;

        emit Supplied(asset, msg.sender, onBehalfOf, amount);
    }

    function withdraw(
        address asset,
        uint256 amount,
        address to
    ) external override nonReentrant returns (uint256) {
        uint256 scaledAmount = (amount * 1e18) /
            (10 ** ERC20(asset).decimals());
        require(amount > 0, "LendingPool: amount 0");

        address vaultAddr = poolManager.getVault(asset);
        address xTokenAddr = poolManager.getAssetToXToken(asset);
        require(vaultAddr != address(0), "LendingPool: unsupported asset");
        require(xTokenAddr != address(0), "LendingPool: xToken not deployed");

        uint256 sharesToBurn = ERC4626Reserve(vaultAddr).previewWithdraw(
            scaledAmount
        );
        require(
            userShares[msg.sender][asset] >= sharesToBurn,
            "LendingPool: insufficient balance"
        );

        // Check health factor if user has any debt
        uint256 totalDebt = getUserTotalDebt(msg.sender);
        if (totalDebt > 0) {
            uint256 oldCollateral = getUserTotalCollateral(msg.sender);
            uint256 assetPrice = priceOracle.getAssetPrice(asset);
            uint256 withdrawnValueUsd = (scaledAmount * assetPrice) /
                (10 ** ERC4626Reserve(vaultAddr).decimals());

            uint256 newCollateral = oldCollateral > withdrawnValueUsd
                ? oldCollateral - withdrawnValueUsd
                : 0;
            uint256 liquidationThreshold = collateralManager
                .getLiquidationThreshold(asset);
            uint256 newHealthFactor = (newCollateral * liquidationThreshold) /
                totalDebt;

            require(
                newHealthFactor >= 1e18,
                "LendingPool: withdraw would lower health factor"
            );
        }

        // Update user shares before redeeming
        userShares[msg.sender][asset] -= sharesToBurn;

        // Redeem vault shares, pool receives xTokens back
        ERC4626Reserve(vaultAddr).redeem(
            sharesToBurn,
            address(this),
            address(this)
        );

        // Burn xTokens from pool's balance
        xERC20(xTokenAddr).burn(address(this), scaledAmount);

        // Transfer underlying asset back to user
        IERC20(asset).safeTransfer(to, amount);

        emit Withdrawn(asset, msg.sender, to, amount);

        return amount;
    }

    function borrow(
        address asset,
        uint256 amount,
        address onBehalfOf
    ) external override nonReentrant {
        uint8 assetTokenDecimals = ERC20(asset).decimals();
        uint256 scaledAmount = (amount * 1e18) / (10 ** assetTokenDecimals);
        require(amount > 0, "Amount 0");

        address vaultAddr = poolManager.getVault(asset);
        require(vaultAddr != address(0), "Unsupported asset");

        // Calculate current debt and collateral in USD or scaled decimals
        uint256 currentDebt = getUserTotalDebt(msg.sender);
        uint256 currentCollateral = getUserTotalCollateral(msg.sender);

        uint256 assetPrice = priceOracle.getAssetPrice(asset);
        uint256 assetDecimals = ERC4626Reserve(vaultAddr).decimals();

        uint256 addedDebtUsd = (scaledAmount * assetPrice) /
            (10 ** assetDecimals);
        uint256 newTotalDebt = currentDebt + addedDebtUsd;

        uint256 ltv = collateralManager.getLTV(asset);
        require(
            newTotalDebt <= (currentCollateral * ltv) / 1e18,
            "LendingPool: borrow exceeds LTV"
        );

        // Update user debt
        userDebt[msg.sender][asset] += scaledAmount;

        // Transfer underlying tokens directly from pool to borrower
        IERC20(asset).safeTransfer(onBehalfOf, amount);

        emit Borrowed(asset, onBehalfOf, onBehalfOf, amount);
    }

    function repay(
        address asset,
        uint256 amount,
        address onBehalfOf
    ) external override nonReentrant returns (uint256) {
        uint8 assetTokenDecimals = ERC20(asset).decimals();
        uint256 scaledAmount = (amount * 1e18) / (10 ** assetTokenDecimals);
        require(amount > 0, "LendingPool: amount is zero");

        address vaultAddr = poolManager.getVault(asset);
        require(vaultAddr != address(0), "LendingPool: unsupported asset");

        uint256 currentDebt = userDebt[onBehalfOf][asset];
        require(currentDebt > 0, "LendingPool: no debt");

        // Cap the repayment to the actual debt
        uint256 repayScaled = scaledAmount > currentDebt
            ? currentDebt
            : scaledAmount;

        // Convert scaled amount back to token decimals for actual transfer
        uint256 repayAmount = (repayScaled * (10 ** assetTokenDecimals)) / 1e18;

        IERC20(asset).safeTransferFrom(msg.sender, address(this), repayAmount);

        userDebt[onBehalfOf][asset] = currentDebt - repayScaled;

        emit Repaid(asset, onBehalfOf, msg.sender, repayAmount);
        return repayAmount;
    }

    /// @notice View function to get user's vault shares for a given asset
    function getUserShares(
        address user,
        address asset
    ) external view returns (uint256) {
        return userShares[user][asset];
    }

    /// @notice View function to get user's underlying balance for an asset
    function getUserUnderlyingBalance(
        address user,
        address asset
    ) external view returns (uint256) {
        address vaultAddr = poolManager.getVault(asset);
        if (vaultAddr == address(0)) {
            return 0;
        }
        uint256 shares = userShares[user][asset];
        return ERC4626Reserve(vaultAddr).previewRedeem(shares);
    }

    function getUserTotalCollateral(
        address user
    ) public view returns (uint256 totalCollateralUsd) {
        address[] memory assets = poolManager.getAllAssets();

        for (uint256 i = 0; i < assets.length; i++) {
            address asset = assets[i];
            if (!poolManager.isCollateralEnabled(asset)) continue;

            address vaultAddr = poolManager.getVault(asset);
            uint256 shares = userShares[user][asset];
            if (shares == 0) continue;

            uint256 underlyingAmount = ERC4626Reserve(vaultAddr).previewRedeem(
                shares
            );

            // Use price oracle to get USD price with decimals handled
            uint256 price = priceOracle.getAssetPrice(asset); // Assume returns price in 1e18 scale
            uint256 decimals = ERC4626Reserve(vaultAddr).decimals();

            uint256 collateralValueUsd = (underlyingAmount * price) /
                (10 ** decimals);
            totalCollateralUsd += collateralValueUsd;
        }
    }

    function getUserTotalDebt(
        address user
    ) public view returns (uint256 totalDebtUsd) {
        address[] memory assets = poolManager.getAllAssets();

        for (uint256 i = 0; i < assets.length; i++) {
            address asset = assets[i];
            uint256 debt = userDebt[user][asset];
            if (debt == 0) continue;

            uint256 price = priceOracle.getAssetPrice(asset);
            address vaultAddr = poolManager.getVault(asset);
            uint256 decimals = ERC4626Reserve(vaultAddr).decimals();

            uint256 debtValueUsd = (debt * price) / (10 ** decimals);
            totalDebtUsd += debtValueUsd;
        }
    }

    function getHealthFactor(address user) public view returns (uint256) {
        uint256 totalDebtUsd = getUserTotalDebt(user);

        if (totalDebtUsd == 0) {
            return type(uint256).max;
        }

        address[] memory assets = poolManager.getAllAssets();
        uint256 adjustedCollateralUsd = 0;

        for (uint256 i = 0; i < assets.length; i++) {
            address asset = assets[i];
            if (!poolManager.isCollateralEnabled(asset)) {
                continue;
            }

            uint256 shares = userShares[user][asset];
            if (shares == 0) {
                continue;
            }

            address vault = poolManager.getVault(asset);
            uint256 underlyingAmount = ERC4626Reserve(vault).previewRedeem(
                shares
            );
            uint256 price = priceOracle.getAssetPrice(asset);
            uint256 decimals = ERC4626Reserve(vault).decimals();
            uint256 valueUsd = (underlyingAmount * price) / (10 ** decimals);
            uint256 liqThreshold = collateralManager.getLiquidationThreshold(
                asset
            );
            uint256 adjusted = (valueUsd * liqThreshold) / 1e18;
            adjustedCollateralUsd += adjusted;
        }

        uint256 healthFactor = (adjustedCollateralUsd * 1e18) / totalDebtUsd;

        return healthFactor;
    }
}
