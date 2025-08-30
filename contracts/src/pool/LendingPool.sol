// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../protocol/PoolConfigurationProvider.sol";
import "../protocol/Universal.sol";
import "../interfaces/ILendingPool.sol";
import "../interfaces/ISwap.sol";
import "../vaults/ERC4626Reserve.sol";
import "../interestBearingToken/xERC20.sol";
import { UniversalIdentityLib as UILib } from "../libraries/UniversalIdentityLib.sol";

contract LendingPool is ILendingPool, PoolConfigurationProvider, ReentrancyGuard, Universal {
    using SafeERC20 for IERC20;

    IPoolManager public poolManager;
    IPriceOracle public priceOracle;
    ICollateralManager public collateralManager;
    IInterestRateModel public interestRateModel;
    ISwap public swapZRC20;

    /// @dev user => asset => shares deposited in the vault
    // mapping(address => mapping(address => uint256)) internal userShares;

    mapping(bytes32 => mapping(address => uint256)) public userScaledShares;
    mapping(bytes32 => mapping(address => uint256)) public userSupplied;
    mapping(bytes32 => mapping(address => uint256)) public userDebt;

    /// @dev user => asset => debt amount
    // mapping(address => mapping(address => uint256)) internal userDebt;
    mapping(bytes32 => mapping(address => uint256)) internal userScaledDebt;
    mapping(bytes32 => mapping(address => uint256)) public userPrincipalDebt;

    mapping(address => uint256) public totalScaledDebt; // in 1e18 scale

    uint256 public constant RAY = 1e27;
    uint256 public constant SECONDS_PER_YEAR = 365 days;

    event Supplied(address indexed asset, UILib.UniversalIdentity indexed sender, UILib.UniversalIdentity indexed onBehalfOf, uint256 amount);
    event Withdrawn(address indexed asset, UILib.UniversalIdentity indexed sender, UILib.UniversalIdentity indexed to, uint256 amount);
    event Borrowed(address indexed asset, UILib.UniversalIdentity indexed sender, UILib.UniversalIdentity indexed onBehalfOf, uint256 amount);
    event Repaid(address indexed asset, UILib.UniversalIdentity indexed repayer, UILib.UniversalIdentity indexed onBehalfOf, uint256 amount);

    constructor(
        address _acm,
        address _poolManager,
        address _interestRateModel,
        address _priceOracle,
        address _collateralManager,
        address payable _gatewayAddress,
        address _swap
    )
        PoolConfigurationProvider(_acm, _poolManager, _interestRateModel, _priceOracle, _collateralManager)
        Universal(_gatewayAddress)
    {
        poolManager = IPoolManager(_poolManager);
        priceOracle = IPriceOracle(_priceOracle);
        collateralManager = ICollateralManager(_collateralManager);
        interestRateModel = IInterestRateModel(_interestRateModel);
        swapZRC20 = ISwap(_swap);
    }

    function onCall(MessageContext calldata context, address zrc20, uint256 amount, bytes calldata message)
        external
        override
        onlyGateway
    {
        (string memory fnName, bytes memory onBehalfOf, uint256 onBehalfOfChainId, address vaultAsset, address withdrawAsset, uint256 assetAmount) = 
            abi.decode(message, (string, bytes, uint256, address, address, uint256));
        bytes32 selector = keccak256(abi.encodePacked(fnName));

        UILib.UniversalIdentity memory senderUID = UILib.toUniversalIdentity(context.chainID, context.sender);
        UILib.UniversalIdentity memory onBehalfOfUId = UILib.toUniversalIdentity(onBehalfOfChainId, onBehalfOf);

        if (selector == keccak256(abi.encodePacked("supply"))) {
            uint256 outputTokenAmount;
            if (zrc20 == vaultAsset) {
                outputTokenAmount = amount; // No swap needed
            } else {
                IERC20(zrc20).approve(address(swapZRC20), amount);
                outputTokenAmount = swapZRC20.swap(zrc20, amount, vaultAsset, address(this));
            }
            _supply(vaultAsset, outputTokenAmount, senderUID, onBehalfOfUId);
        } else if (selector == keccak256(abi.encodePacked("repay"))) {
            uint256 outputTokenAmount;
            if (zrc20 == vaultAsset) {
                outputTokenAmount = amount; // No swap needed
            } else {
                IERC20(zrc20).approve(address(swapZRC20), amount);
                outputTokenAmount = swapZRC20.swap(zrc20, amount, vaultAsset, address(this));
            }
            _repay(vaultAsset, outputTokenAmount, senderUID, onBehalfOfUId);
        } else if (selector == keccak256(abi.encodePacked("borrow"))) {
            _borrow(vaultAsset, assetAmount, senderUID, onBehalfOfUId, withdrawAsset); // onBehalf = to
        } else if (selector == keccak256(abi.encodePacked("withdraw"))) {
            _withdraw(vaultAsset, assetAmount, senderUID, onBehalfOfUId, withdrawAsset); // onBehalf = to
        } else {
            revert("LendingPool: Unsupported onCall function");
        }
    }

    function supply(address asset, uint256 amount, UILib.UniversalIdentity memory onBehalfOf) public override nonReentrant {
        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
        UILib.UniversalIdentity memory senderUID = UILib.toUniversalIdentity(block.chainid, msg.sender);
        _supply(asset, amount, senderUID, onBehalfOf);
    }

    function _supply(address asset, uint256 amount, UILib.UniversalIdentity memory sender, UILib.UniversalIdentity memory onBehalfOf) internal {
        bytes32 onBehalfOfUserId = UILib.computeUserId(onBehalfOf);
        userSupplied[onBehalfOfUserId][asset] += amount;
        uint8 assetDecimals = ERC20(asset).decimals();
        uint256 scaledAmount = (amount * 1e18) / (10 ** assetDecimals);

        require(scaledAmount > 0, "LendingPool: amount 0");

        // Update interest accrual before any state change
        _updateLiquidityIndex(asset);

        address vaultAddr = poolManager.getVault(asset);
        address xTokenAddr = poolManager.getAssetToXToken(asset);
        require(vaultAddr != address(0), "LendingPool: unsupported asset");
        require(xTokenAddr != address(0), "LendingPool: xToken not deployed");

        // Mint equivalent xERC20 tokens to this lending pool contract
        xERC20(xTokenAddr).mint(address(this), scaledAmount);

        // Approve vault to spend xERC20 tokens
        IERC20(xTokenAddr).approve(vaultAddr, scaledAmount);

        // Deposit xERC20 tokens into the vault, receive shares
        uint256 shares = ERC4626Reserve(vaultAddr).deposit(scaledAmount, address(this));

        uint256 currentIndex = poolManager.getLiquidityIndex(asset);
        require(currentIndex > 0, "Liquidity index not initialized");

        // Convert shares to scaled shares (normalized by liquidity index)
        uint256 scaledShares = (shares * RAY) / currentIndex;

        // Update user scaled shares (this reflects user's principal + accrued interest)
        userScaledShares[onBehalfOfUserId][asset] += scaledShares;

        emit Supplied(asset, sender, onBehalfOf, amount);
    }

    function withdraw(address asset, uint256 amount, UILib.UniversalIdentity memory to) public override nonReentrant returns (uint256) {
        UILib.UniversalIdentity memory senderUID = UILib.toUniversalIdentity(block.chainid, msg.sender);
        return _withdraw(asset, amount, senderUID, to, asset);
    }

    function _withdraw(address asset, uint256 amount, UILib.UniversalIdentity memory sender, UILib.UniversalIdentity memory to, address withdrawAsset) internal returns (uint256) {
        bytes32 senderUserId = UILib.computeUserId(sender);
        userSupplied[senderUserId][asset] -= amount;
        require(amount > 0, "LendingPool: amount 0");

        _updateLiquidityIndex(asset);

        address vaultAddr = poolManager.getVault(asset);
        address xTokenAddr = poolManager.getAssetToXToken(asset);
        require(vaultAddr != address(0), "LendingPool: unsupported asset");
        require(xTokenAddr != address(0), "LendingPool: xToken not deployed");

        uint256 scaledAmount = (amount * 1e18) / (10 ** ERC20(asset).decimals());

        require(poolManager.getLiquidityIndex(asset) > 0, "Liquidity index not initialized");

        uint256 sharesToBurn = ERC4626Reserve(vaultAddr).previewWithdraw(scaledAmount);
        uint256 scaledSharesToBurn = (sharesToBurn * RAY) / poolManager.getLiquidityIndex(asset);

        require(userScaledShares[senderUserId][asset] >= scaledSharesToBurn, "LendingPool: insufficient balance");

        _checkWithdrawHealthFactor(senderUserId, asset, scaledAmount, vaultAddr);

        _burnAndRedeem(senderUserId, asset, xTokenAddr, sharesToBurn, scaledSharesToBurn, scaledAmount, to, withdrawAsset);

        emit Withdrawn(asset, sender, to, amount);

        return amount;
    }

    function _checkWithdrawHealthFactor(bytes32 user, address asset, uint256 scaledAmount, address vaultAddr)
        internal
        view
    {
        uint256 totalDebt = getUserTotalDebt(user);
        if (totalDebt == 0) return;

        uint256 oldCollateral = getUserTotalCollateral(user);
        uint256 assetPrice = priceOracle.getAssetPrice(asset);
        uint256 withdrawnValueUsd = (scaledAmount * assetPrice) / (10 ** ERC4626Reserve(vaultAddr).decimals());

        uint256 newCollateral = oldCollateral > withdrawnValueUsd ? oldCollateral - withdrawnValueUsd : 0;
        uint256 liquidationThreshold = collateralManager.getLiquidationThreshold(asset);
        uint256 newHealthFactor = (newCollateral * liquidationThreshold) / totalDebt;

        require(newHealthFactor >= 1e18, "LendingPool: withdraw would lower health factor");
    }

    function _burnAndRedeem(
        bytes32 user,
        address asset,
        address xTokenAddr,
        uint256 sharesToBurn,
        uint256 scaledSharesToBurn,
        uint256 scaledAmount,
        UILib.UniversalIdentity memory to,
        address withdrawAsset
    ) internal {
        address vaultAddr = poolManager.getVault(asset);

        // Update user scaled shares
        userScaledShares[user][asset] -= scaledSharesToBurn;

        // Redeem vault shares - vault burns shares and returns xTokens to pool
        ERC4626Reserve(vaultAddr).redeem(sharesToBurn, address(this), address(this));

        // Burn xTokens from pool's balance
        xERC20(xTokenAddr).burn(address(this), scaledAmount);

        // Transfer underlying asset to user
        _transferAssetToUser(asset, to, (scaledAmount * (10 ** ERC20(asset).decimals())) / 1e18, withdrawAsset);
    }

    function borrow(address asset, uint256 amount, UILib.UniversalIdentity memory onBehalfOf) public override nonReentrant {
        UILib.UniversalIdentity memory senderUID = UILib.toUniversalIdentity(block.chainid, msg.sender);  
        _borrow(asset, amount, senderUID, onBehalfOf, asset);  
    }

    function _borrow(address asset, uint256 amount, UILib.UniversalIdentity memory sender, UILib.UniversalIdentity memory to, address withdrawAsset) internal {
        bytes32 senderUserId = UILib.computeUserId(sender);
        userDebt[senderUserId][asset] += amount;
        require(amount > 0, "Amount 0");

        _updateLiquidityIndex(asset);

        address vaultAddr = poolManager.getVault(asset);
        require(vaultAddr != address(0), "Unsupported asset");

        _checkBorrowLimits(senderUserId, asset, amount, vaultAddr);

        uint256 currentIndex = poolManager.getLiquidityIndex(asset);
        require(currentIndex > 0, "Liquidity index not initialized");

        uint256 scaledAmount = (amount * 1e18) / (10 ** ERC20(asset).decimals());
        uint256 scaledDebt = (scaledAmount * RAY) / currentIndex;

        _updateDebt(senderUserId, asset, scaledDebt, amount);

        _transferAssetToUser(asset, to, amount, withdrawAsset);

        emit Borrowed(asset, sender, to, amount);
    }

    function _transferAssetToUser(address asset, UILib.UniversalIdentity memory receiver, uint256 amount, address withdrawAsset) internal {
        if (receiver.chainId == block.chainid) {
            // Assuming identity is abi.encodePacked(address)
            require(receiver.identity.length == 20, "Invalid identity length");
            bytes memory receiverBytes = receiver.identity;
            address to;
            assembly {
                to := mload(add(receiverBytes, 20))
            }

            IERC20(asset).safeTransfer(to, amount);
        } else {
            // Send to swap contract that swaps asset to withdrawAsset and initiates withdrawal to the gateway
            IERC20(asset).approve(address(swapZRC20), amount);
            swapZRC20.swapAndWithdraw(address(this), asset, amount, withdrawAsset, receiver.identity);
        }
    }

    function _checkBorrowLimits(bytes32 user, address asset, uint256 amount, address vaultAddr) internal view {
        uint256 currentDebt = getUserTotalDebt(user);
        uint256 currentCollateral = getUserTotalCollateral(user);

        uint256 assetPrice = priceOracle.getAssetPrice(asset);
        uint256 assetDecimals = ERC4626Reserve(vaultAddr).decimals();

        uint256 scaledAmount = (amount * 1e18) / (10 ** ERC20(asset).decimals());
        uint256 addedDebtUsd = (scaledAmount * assetPrice) / (10 ** assetDecimals);
        uint256 newTotalDebt = currentDebt + addedDebtUsd;

        uint256 ltv = collateralManager.getLTV(asset);
        require(newTotalDebt <= (currentCollateral * ltv) / 1e18, "LendingPool: borrow exceeds LTV");
    }

    function _updateDebt(bytes32 onBehalfOf, address asset, uint256 scaledDebt, uint256 normalDebt) internal {
        userScaledDebt[onBehalfOf][asset] += scaledDebt;
        totalScaledDebt[asset] += scaledDebt;
        userPrincipalDebt[onBehalfOf][asset] += normalDebt;
    }

    function repay(address asset, uint256 amount, UILib.UniversalIdentity memory onBehalfOf) public override nonReentrant returns (uint256) {
        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
        UILib.UniversalIdentity memory senderUID = UILib.toUniversalIdentity(block.chainid, msg.sender);
        return _repay(asset, amount, senderUID, onBehalfOf);
    }

    function _repay(address asset, uint256 amount, UILib.UniversalIdentity memory repayer, UILib.UniversalIdentity memory onBehalfOf) internal returns (uint256) {
        bytes32 onBehalfOfUserId = UILib.computeUserId(onBehalfOf);
        userDebt[onBehalfOfUserId][asset] += amount;
        require(amount > 0, "LendingPool: amount is zero");

        _updateLiquidityIndex(asset);

        address vaultAddr = poolManager.getVault(asset);
        require(vaultAddr != address(0), "LendingPool: unsupported asset");

        uint256 currentIndex = poolManager.getLiquidityIndex(asset);
        require(currentIndex > 0, "Liquidity index not initialized");

        (uint256 repayAmount, uint256 scaledToRepay, uint256 repayPrincipal, uint256 interestPortion) =
            _prepareRepayAmounts(asset, amount, onBehalfOfUserId, currentIndex);

        require(repayAmount >= amount, "repaied amount not sufficient");

        _applyRepayUpdates(asset, onBehalfOfUserId, repayAmount, scaledToRepay, repayPrincipal, interestPortion, vaultAddr);

        emit Repaid(asset, repayer, onBehalfOf, repayAmount);

        return repayAmount;
    }

    function _prepareRepayAmounts(address asset, uint256 amount, bytes32 onBehalfOfUserId, uint256 currentIndex)
        internal
        view
        returns (uint256 repayAmount, uint256 scaledToRepay, uint256 repayPrincipal, uint256 interestPortion)
    {
        uint256 decimals = ERC20(asset).decimals();
        uint256 scaledAmount = (amount * 1e18) / (10 ** decimals);
        uint256 scaledDebt = userScaledDebt[onBehalfOfUserId][asset];
        require(scaledDebt > 0, "LendingPool: no debt");
        uint256 principalOutstanding = userPrincipalDebt[onBehalfOfUserId][asset];
        require(principalOutstanding > 0, "LendingPool: no principal debt");

        (repayAmount, scaledToRepay) = _calculateRepayAmounts(asset, scaledAmount, scaledDebt, currentIndex);

        (repayPrincipal, interestPortion) = _splitRepayAmount(repayAmount, principalOutstanding);

        return (repayAmount, scaledToRepay, repayPrincipal, interestPortion);
    }

    function _applyRepayUpdates(
        address asset,
        bytes32 onBehalfOfUserId,
        uint256 repayAmount,
        uint256 scaledToRepay,
        uint256 repayPrincipal,
        uint256 interestPortion,
        address vaultAddr
    ) internal {
        userScaledDebt[onBehalfOfUserId][asset] -= scaledToRepay;
        totalScaledDebt[asset] -= scaledToRepay;
        userPrincipalDebt[onBehalfOfUserId][asset] -= repayPrincipal;

        if (interestPortion > 0) {
            _handleInterestPortion(asset, interestPortion, vaultAddr);
        }
    }

    function _splitRepayAmount(uint256 repayAmount, uint256 principalOutstanding)
        internal
        pure
        returns (uint256 repayPrincipal, uint256 interestPortion)
    {
        if (repayAmount > principalOutstanding) {
            repayPrincipal = principalOutstanding;
            interestPortion = repayAmount - principalOutstanding;
        } else {
            repayPrincipal = repayAmount;
            interestPortion = 0;
        }
    }

    function _calculateRepayAmounts(address asset, uint256 scaledAmount, uint256 scaledDebt, uint256 currentIndex)
        internal
        view
        returns (uint256 repayAmount, uint256 scaledToRepay)
    {
        uint8 decimals = ERC20(asset).decimals();

        // actualDebt in underlying decimals
        uint256 actualDebt = (scaledDebt * currentIndex) / RAY;

        // Convert actualDebt to scaled decimals (18 decimals)
        uint256 actualDebtScaled = (actualDebt * 1e18) / (10 ** decimals);

        // Cap repayScaled to actualDebtScaled
        uint256 repayScaled = scaledAmount > actualDebtScaled ? actualDebtScaled : scaledAmount;

        // Convert repayScaled back to underlying decimals for transfer
        repayAmount = (repayScaled * (10 ** decimals)) / 1e18;

        // Convert repayScaled to scaled units for bookkeeping
        scaledToRepay = (repayScaled * RAY) / currentIndex;

        // Final safeguard: ensure scaledToRepay does not exceed scaledDebt
        if (scaledToRepay > scaledDebt) {
            scaledToRepay = scaledDebt;
            // Recalculate repayAmount from scaledToRepay to underlying decimals
            uint256 actualRepayUnderlying = (scaledToRepay * currentIndex) / RAY;
            repayAmount = (actualRepayUnderlying * (10 ** decimals)) / 1e18;
        }
    }

    function _handleInterestPortion(address asset, uint256 interestAmount, address vaultAddr) internal {
        uint256 scaledInterestAmount = (interestAmount * 1e18) / (10 ** ERC20(asset).decimals());

        xERC20 xToken = xERC20(poolManager.getAssetToXToken(asset));

        xToken.mint(address(this), scaledInterestAmount);

        IERC20(address(xToken)).transfer(vaultAddr, scaledInterestAmount);
    }

    /// @notice View function to get user's underlying balance for an asset
    function getUserUnderlyingBalance(UILib.UniversalIdentity memory user, address asset) external view returns (uint256) {
        bytes32 userId = UILib.computeUserId(user);
        address vaultAddr = poolManager.getVault(asset);
        if (vaultAddr == address(0)) return 0;

        uint256 scaledShares = getUserShares(userId, asset);
        if (scaledShares == 0) return 0;

        uint256 liquidityIndex = poolManager.getLiquidityIndex(asset);
        uint256 actualVaultShares = (scaledShares * liquidityIndex) / RAY;

        return ERC4626Reserve(vaultAddr).previewRedeem(actualVaultShares);
    }

    function getUserTotalCollateral(bytes32 user) public view returns (uint256 totalCollateralUsd) {
        address[] memory assets = poolManager.getAllAssets();

        for (uint256 i = 0; i < assets.length; i++) {
            address asset = assets[i];
            if (!poolManager.isCollateralEnabled(asset)) continue;

            address vaultAddr = poolManager.getVault(asset);
            uint256 scaledShares = getUserShares(user, asset);
            if (scaledShares == 0) continue;

            uint256 liquidityIndex = poolManager.getLiquidityIndex(asset);
            uint256 actualShares = (scaledShares * liquidityIndex) / RAY;

            uint256 underlyingAmount = ERC4626Reserve(vaultAddr).previewRedeem(actualShares);

            // Use price oracle to get USD price with decimals handled
            uint256 price = priceOracle.getAssetPrice(asset); // Assume returns price in 1e18 scale
            uint256 decimals = ERC4626Reserve(vaultAddr).decimals();

            uint256 collateralValueUsd = (underlyingAmount * price) / (10 ** decimals);
            totalCollateralUsd += collateralValueUsd;
        }
    }

    function getUserSuppliedAsset(bytes32 user, address asset) public view returns (uint256) {
        return userSupplied[user][asset];
    }

    function getUserBorrowedAsset(bytes32 user, address asset) public view returns (uint256) {
        return userDebt[user][asset];
    }

    function getUserTotalDebt(bytes32 user) public view returns (uint256 totalDebtUsd) {
        address[] memory assets = poolManager.getAllAssets();

        for (uint256 i = 0; i < assets.length; i++) {
            address asset = assets[i];
            // uint256 debt = userDebt[user][asset];
            uint256 scaledDebt = userScaledDebt[user][asset];
            if (scaledDebt == 0) continue;

            uint256 liquidityIndex = poolManager.getLiquidityIndex(asset);
            uint256 actualDebt = (scaledDebt * liquidityIndex) / RAY;
            // if (debt == 0) continue;

            uint256 price = priceOracle.getAssetPrice(asset);
            address vaultAddr = poolManager.getVault(asset);
            uint256 decimals = ERC4626Reserve(vaultAddr).decimals();

            uint256 debtValueUsd = (actualDebt * price) / (10 ** decimals);
            totalDebtUsd += debtValueUsd;
        }
    }

    function getHealthFactor(bytes32 user) public view returns (uint256) {
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

            uint256 scaledShares = getUserShares(user, asset);
            if (scaledShares == 0) continue;

            address vault = poolManager.getVault(asset);
            uint256 liquidityIndex = poolManager.getLiquidityIndex(asset);
            uint256 actualShares = (scaledShares * liquidityIndex) / RAY;

            uint256 underlyingAmount = ERC4626Reserve(vault).previewRedeem(actualShares);

            // uint256 shares = userShares[user][asset];
            // if (shares == 0) {
            //     continue;
            // }

            // address vault = poolManager.getVault(asset);
            // uint256 underlyingAmount = ERC4626Reserve(vault).previewRedeem(
            //     shares
            // );
            uint256 price = priceOracle.getAssetPrice(asset);
            uint256 decimals = ERC4626Reserve(vault).decimals();
            uint256 valueUsd = (underlyingAmount * price) / (10 ** decimals);
            uint256 liqThreshold = collateralManager.getLiquidationThreshold(asset);
            uint256 adjusted = (valueUsd * liqThreshold) / 1e18;
            adjustedCollateralUsd += adjusted;
        }

        uint256 healthFactor = (adjustedCollateralUsd * 1e18) / totalDebtUsd;

        return healthFactor;
    }

    function getTotalBorrowed(address asset) public view returns (uint256) {
        uint256 scaledDebt = totalScaledDebt[asset]; // scaled (RAY)
        uint256 liquidityIndex = poolManager.getLiquidityIndex(asset); // scaled (RAY)
        return (scaledDebt * liquidityIndex) / RAY; // underlying decimals
    }

    function getTotalSupplied(address asset) public view returns (uint256) {
        address vault = poolManager.getVault(asset);
        if (vault == address(0)) return 0;
        return ERC4626Reserve(vault).totalAssets(); // returns total underlying
    }

    function _updateLiquidityIndex(address asset) internal {
        uint40 lastUpdated = poolManager.getLastUpdateTimestamp(asset);
        uint256 lastIndex = poolManager.getLiquidityIndex(asset);
        uint40 currentTimestamp = uint40(block.timestamp);

        if (lastUpdated == 0) {
            // First time: initialize
            poolManager.setLiquidityIndex(asset, RAY);
            poolManager.setLastUpdateTimestamp(asset, currentTimestamp);
            return;
        }

        uint256 timeElapsed = currentTimestamp - lastUpdated;
        if (timeElapsed == 0) return;

        uint256 totalBorrows = getTotalBorrowed(asset); // From LendingPool
        uint256 totalLiquidity = getTotalSupplied(asset); // From LendingPool

        if (totalLiquidity == 0 && totalBorrows == 0) return;

        uint256 utilization = totalLiquidity == 0 ? 0 : (totalBorrows * RAY) / totalLiquidity;

        uint256 borrowRate = interestRateModel.getBorrowRate(utilization);
        uint256 supplyRate = interestRateModel.getSupplyRate(utilization, borrowRate);

        // uint256 interestAccrued = RAY + (supplyRate * timeElapsed);
        uint256 interestAccrued = RAY + ((supplyRate * timeElapsed) / SECONDS_PER_YEAR);
        uint256 newIndex = (lastIndex * interestAccrued) / RAY;

        poolManager.setLiquidityIndex(asset, newIndex);
        poolManager.setLastUpdateTimestamp(asset, currentTimestamp);
    }

    function getUserShares(bytes32 user, address asset) public view returns (uint256) {
        uint256 currentIndex = poolManager.getLiquidityIndex(asset);
        return (userScaledShares[user][asset] * currentIndex) / RAY;
    }

    function getCurrentBorrowRate(address asset) external view returns (uint256) {
        uint256 utilization = _calculateUtilization(asset);
        return interestRateModel.getBorrowRate(utilization);
    }

    function getCurrentSupplyRate(address asset) external view returns (uint256) {
        uint256 utilization = _calculateUtilization(asset);
        uint256 borrowRate = interestRateModel.getBorrowRate(utilization);
        return interestRateModel.getSupplyRate(utilization, borrowRate);
    }

    function _calculateUtilization(address asset) public view returns (uint256) {
        uint256 totalBorrows = getTotalBorrowed(asset); // underlying
        uint256 totalLiquidity = getTotalSupplied(asset); // underlying

        if (totalLiquidity == 0) {
            return 0;
        }

        return (totalBorrows * RAY) / totalLiquidity; // utilization in RAY (wad)
    }

    function getMaxWithdrawableByShares(bytes32 user, address asset) public view returns (uint256) {
        address vault = poolManager.getVault(asset);
        require(vault != address(0), "No vault for asset");

        uint8 decimals = ERC20(asset).decimals();

        uint256 userShares = getUserShares(user, asset);
        if (userShares == 0) return 0;

        // Convert scaled shares to actual shares by adjusting with liquidity index
        uint256 liquidityIndex = poolManager.getLiquidityIndex(asset);
        require(liquidityIndex > 0, "Liquidity index not set");

        // Convert scaled shares to shares expected by vault (vault works in actual shares)
        uint256 actualShares = (userShares * RAY) / liquidityIndex;

        // Now preview how many underlying tokens user can redeem for actualShares
        uint256 underlyingAmount = ERC4626Reserve(vault).previewRedeem(actualShares);

        return (underlyingAmount * (10 ** decimals)) / 1e18;
    }

    function onRevert(
        RevertContext calldata revertContext
    ) external override onlyGateway {
        emit RevertEvent("Revert on ZetaChain", revertContext);
    }
}
