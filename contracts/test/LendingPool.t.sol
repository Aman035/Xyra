// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/accessControl/AccessControlManager.sol";
import "../src/pool/LendingPool.sol";
import "../src/poolManager/PoolManager.sol";
import "../src/collateral/CollateralManager.sol";
import "../src/interestRate/InterestRateManager.sol";
import "../src/mocks/PriceOracle.sol";
import "../src/mocks/MockToken.sol";
import { UniversalIdentityLib as UILib } from "../src/libraries/UniversalIdentityLib.sol";

contract LendingPoolTest is Test {
    uint256 public constant RAY = 1e27;

    AccessControlManager public acm;
    LendingPool public lendingPool;
    PoolManager public poolManager;
    CollateralManager public collateralManager;
    InterestRateManager public interestRateModel;
    PriceOracle public priceOracle;

    MockToken public usdc;
    MockToken public dai;

    address public alice = address(0x1);
    address public bob = address(0x2);
    address public charlie = address(0x3);

    UILib.UniversalIdentity public aliceUID;
    UILib.UniversalIdentity public bobUID;
    UILib.UniversalIdentity public charlieUID;

    function setUp() public {
        aliceUID = UILib.toUniversalIdentity(block.chainid, alice);
        bobUID = UILib.toUniversalIdentity(block.chainid, bob);
        charlieUID = UILib.toUniversalIdentity(block.chainid, charlie);
        vm.startPrank(charlie);
        // Deploy mock tokens
        usdc = new MockToken("USD Coin", "USDC", 6);
        dai = new MockToken("DAI Stablecoin", "DAI", 18);

        // Deploy core contracts
        acm = new AccessControlManager();
        priceOracle = new PriceOracle(address(acm));
        interestRateModel = new InterestRateManager(
            address(acm),
            0.002e27, // baseRate (1%)
            0.1e27, // rateMultiplier (10%)
            0.8e27, // optimalUtilization (80%)
            2e27, // jumpMultiplier (200%)
            1e26 // reserveFactor (10%)
        );
        collateralManager = new CollateralManager(address(acm));
        poolManager = new PoolManager(address(acm));

        // Deploy main lending pool
        lendingPool = new LendingPool(
            address(acm),
            address(poolManager),
            address(interestRateModel),
            address(priceOracle),
            address(collateralManager),
            payable(address(0)),
            address(0)
        );

        poolManager.setLendingPool(address(lendingPool));

        vm.stopPrank();

        // Setup tokens and pools
        _setupPool(usdc);
        _setupPool(dai);

        // Fund test accounts
        usdc.mint(alice, 10000 * 1e6); // 10,000 USDC
        dai.mint(alice, 10000 * 1e18); // 10,000 DAI
        usdc.mint(bob, 10000 * 1e6); // 10,000 USDC
        dai.mint(bob, 10000 * 1e18); // 10,000 DAI

        // Approve lending pool
        vm.startPrank(alice);
        usdc.approve(address(lendingPool), type(uint256).max);
        dai.approve(address(lendingPool), type(uint256).max);
        vm.stopPrank();

        vm.startPrank(bob);
        usdc.approve(address(lendingPool), type(uint256).max);
        dai.approve(address(lendingPool), type(uint256).max);
        vm.stopPrank();
    }

    function _setupPool(MockToken token) internal {
        console.log(acm.isPoolManager(charlie));
        vm.startPrank(charlie);
        poolManager.createVault(address(token));

        // Enable token as collateral
        poolManager.setCollateralStatus(address(token), true);

        // Set price in oracle (1 USD)
        // priceOracle.setAssetPrice(address(token), 1e18);
        // vm.startPrank(charlie);
        priceOracle.setAssetPrice(address(usdc), 1e18);
        priceOracle.setAssetPrice(address(dai), 1e18);
        collateralManager.setCollateralConfig(address(usdc), 0.75e18, 0.85e18, 1e18, true);
        collateralManager.setCollateralConfig(address(dai), 0.75e18, 0.85e18, 1e18, true);
        // vm.stopPrank();
        vm.stopPrank();
    }

    //     function _supplyUSDC() internal {
    //     uint256 supplyAmount = 1000 * 1e6; // 1000 USDC

    //     vm.startPrank(alice);
    //     lendingPool.supply(address(usdc), supplyAmount, alice);
    //     vm.stopPrank();

    //     vm.startPrank(bob);
    //     lendingPool.supply(address(usdc), supplyAmount, bob);
    //     vm.stopPrank();
    // }

    function _getAddressOfIdentity(UILib.UniversalIdentity memory user) internal returns (address) {
        require(user.identity.length == 20, "Invalid identity length");
        bytes memory userBytes = user.identity;
        address to;
        assembly {
            to := mload(add(userBytes, 20))
        }
        return to;
    }

    function _supplyUSDC(UILib.UniversalIdentity memory user, uint256 amount) internal {
        address userAddr = _getAddressOfIdentity(user);
        vm.startPrank(userAddr);
        lendingPool.supply(address(usdc), amount, user);
        vm.stopPrank();
    }

    function _supplyDAI(UILib.UniversalIdentity memory user, uint256 amount) internal {
        address userAddr = _getAddressOfIdentity(user);
        vm.startPrank(userAddr);
        lendingPool.supply(address(dai), amount, user);
        vm.stopPrank();
    }

    function _borrowDAI(UILib.UniversalIdentity memory user, uint256 amount) internal {
        address userAddr = _getAddressOfIdentity(user);
        vm.startPrank(userAddr);
        lendingPool.borrow(address(dai), amount, user);
        vm.stopPrank();
    }

    function _setupAliceUSDCandBobDAI() internal {
        _supplyUSDC(aliceUID, 1000 * 1e6);
        _supplyDAI(bobUID, 1000 * 1e18);

        vm.startPrank(charlie);
        priceOracle.setAssetPrice(address(usdc), 1e18);
        priceOracle.setAssetPrice(address(dai), 1e18);
        collateralManager.setCollateralConfig(address(usdc), 0.75e18, 0.85e18, 1e18, true);
        collateralManager.setCollateralConfig(address(dai), 0.75e18, 0.85e18, 1e18, true);
        vm.stopPrank();
    }

    function testSupply() public {
        address vaultAddr = poolManager.getVault(address(usdc));
        uint256 supplyAmount = 1000 * 1e6; // 1000 USDC

        // Check initial balances
        assertEq(usdc.balanceOf(alice), 10000 * 1e6);

        // Supply USDC
        _supplyUSDC(aliceUID, supplyAmount);

        // Supply USDC
        _supplyUSDC(bobUID, supplyAmount);
    }

    function testWithdraw() public {
        address vaultAddr = poolManager.getVault(address(usdc));
        uint256 withdrawAmount = 500 * 1e6; // 500 USDC

        // First supply
        testSupply();

        // Then withdraw half
        vm.startPrank(alice);
        lendingPool.withdraw(address(usdc), withdrawAmount, aliceUID);
        vm.stopPrank();

        // Check final balances
        console.log(usdc.balanceOf(alice)); // 9500 USDC (10000 - 1000 + 500)
        console.log(usdc.balanceOf(vaultAddr));
    }

    function testRepay() public {
        address asset = address(usdc);
        uint256 supplyAmount = 1000 * 1e6;
        uint256 borrowAmount = 400 * 1e6;
        uint256 repayAmount = 200 * 1e6;

        testSupply();

        // Set price for collateral
        vm.startPrank(charlie);
        priceOracle.setAssetPrice(asset, 1e18); // $1
        priceOracle.setAssetPrice(address(dai), 1e18); // $1
        collateralManager.setCollateralConfig(asset, 0.75e18, 0.85e18, 1e18, true); // ✅ New (1e18)
        vm.stopPrank();

        uint256 aliceBorrowAssetBalanceBefore = usdc.balanceOf(alice);

        // Borrow against collateral
        vm.startPrank(alice);
        lendingPool.borrow(asset, borrowAmount, aliceUID);
        vm.stopPrank();

        uint256 aliceBorrowAssetBalanceAfter = usdc.balanceOf(alice);

        assertEq(aliceBorrowAssetBalanceAfter, aliceBorrowAssetBalanceBefore + borrowAmount);
        assertEq(lendingPool.getUserTotalDebt(UILib.computeUserId(aliceUID)), borrowAmount * 1e12); // scaled to 18 decimals

        // Repay half
        vm.startPrank(alice);
        lendingPool.repay(asset, repayAmount, aliceUID);
        vm.stopPrank();

        // Check updated debt
        uint256 expectedDebt = (borrowAmount - repayAmount) * 1e12;
        assertEq(lendingPool.getUserTotalDebt(UILib.computeUserId(aliceUID)), expectedDebt);
    }

    function testWithdrawFailsDueToHealthFactor() public {
        address asset = address(usdc);
        uint256 supplyAmount = 1000 * 1e6;
        uint256 borrowAmount = 700 * 1e6;

        testSupply();

        vm.startPrank(charlie);
        priceOracle.setAssetPrice(asset, 1e18);
        collateralManager.setCollateralConfig(asset, 0.75e18, 0.85e18, 1e18, true); // ✅ New (1e18)
        vm.stopPrank();

        // Borrow 700 USDC
        vm.startPrank(alice);
        lendingPool.borrow(asset, borrowAmount, aliceUID);
        vm.stopPrank();

        // Attempt to withdraw 500 USDC (should fail because it would drop HF < 1)
        vm.startPrank(alice);
        vm.expectRevert("LendingPool: withdraw would lower health factor");
        lendingPool.withdraw(asset, 500 * 1e6, aliceUID);
        vm.stopPrank();
    }

    function testWithdrawAfterRepay() public {
        address asset = address(usdc);
        uint256 supplyAmount = 1000 * 1e6;
        uint256 borrowAmount = 600 * 1e6;
        uint256 repayAmount = 600 * 1e6;

        testSupply();

        vm.startPrank(charlie);
        priceOracle.setAssetPrice(asset, 1e18);
        collateralManager.setCollateralConfig(asset, 0.75e18, 0.85e18, 1e18, true); // ✅ New (1e18)
        vm.stopPrank();

        vm.startPrank(alice);
        lendingPool.borrow(asset, borrowAmount, aliceUID);
        lendingPool.repay(asset, repayAmount, aliceUID);
        uint256 aliceAssetBalanceBeforeWithdraw = usdc.balanceOf(alice);
        lendingPool.withdraw(asset, 500 * 1e6, aliceUID);
        vm.stopPrank();

        uint256 aliceAssetBalanceAfterWithdraw = usdc.balanceOf(alice);

        // Confirm user got tokens back
        assertGe(aliceAssetBalanceAfterWithdraw, aliceAssetBalanceBeforeWithdraw + 500 * 1e6);
    }

    function testBorrowFailsAboveLTV() public {
        address asset = address(usdc);
        uint256 supplyAmount = 1000 * 1e6;

        testSupply();

        vm.startPrank(charlie);
        priceOracle.setAssetPrice(asset, 1e18); // $1
        collateralManager.setCollateralConfig(asset, 0.75e18, 0.85e18, 1e18, true); // ✅ New (1e18) // LTV: 75%
        vm.stopPrank();

        uint256 borrowAmount = 800 * 1e6; // >75% of $1000 collateral

        vm.startPrank(alice);
        vm.expectRevert("LendingPool: borrow exceeds LTV");
        lendingPool.borrow(asset, borrowAmount, aliceUID);
        vm.stopPrank();
    }

    function testBorrowAtLTVLimit() public {
        address asset = address(usdc);
        uint256 supplyAmount = 1000 * 1e6;
        uint256 borrowAmount = 750 * 1e6; // Exactly 75%

        testSupply();

        vm.startPrank(charlie);
        priceOracle.setAssetPrice(asset, 1e18);
        collateralManager.setCollateralConfig(asset, 0.75e18, 0.85e18, 1e18, true); // ✅ New (1e18) // 75% LTV, 85% liq
        vm.stopPrank();

        vm.startPrank(alice);
        lendingPool.borrow(asset, borrowAmount, aliceUID); // Should succeed
        vm.stopPrank();
    }

    function testWithdrawFailsDueToLiqThreshold() public {
        address asset = address(usdc);
        testSupply();

        vm.startPrank(charlie);
        priceOracle.setAssetPrice(asset, 1e18); // $1
        collateralManager.setCollateralConfig(asset, 0.75e18, 0.85e18, 1e18, true); // ✅ New (1e18) // 75% LTV, 85% liq
        vm.stopPrank();

        // Borrow 740 USDC (just under 75%)
        vm.startPrank(alice);
        lendingPool.borrow(asset, 740 * 1e6, aliceUID);
        vm.stopPrank();

        // Try to withdraw 200 USDC → should drop health factor below 1
        vm.startPrank(alice);
        vm.expectRevert("LendingPool: withdraw would lower health factor");
        lendingPool.withdraw(asset, 200 * 1e6, aliceUID);
        vm.stopPrank();
    }

    function testWithdrawSucceedsJustBeforeHF1() public {
        address asset = address(usdc);
        testSupply();

        vm.startPrank(charlie);
        priceOracle.setAssetPrice(asset, 1e18);
        collateralManager.setCollateralConfig(asset, 0.75e18, 0.85e18, 1e18, true); // ✅ New (1e18)
        vm.stopPrank();

        // Borrow 600 USDC
        vm.startPrank(alice);
        lendingPool.borrow(asset, 600 * 1e6, aliceUID);
        vm.stopPrank();

        // Withdraw 200 USDC → keeps HF slightly above 1
        vm.startPrank(alice);
        lendingPool.withdraw(asset, 200 * 1e6, aliceUID);
        vm.stopPrank();
    }

    function testAliceSuppliesUSDC_BobSuppliesDAI() public {
        _supplyUSDC(aliceUID, 1000 * 1e6);
        _supplyDAI(bobUID, 1000 * 1e18);

        assertEq(usdc.balanceOf(alice), 9000 * 1e6);
        assertEq(dai.balanceOf(bob), 9000 * 1e18);
    }

    function testAliceBorrowsDAI() public {
        _setupAliceUSDCandBobDAI();

        uint256 aliceDaiBalanceBeforeWithdraw = dai.balanceOf(alice);

        // Alice borrows DAI against USDC collateral
        uint256 borrowAmount = 400 * 1e18;
        _borrowDAI(aliceUID, borrowAmount);

        assertEq(dai.balanceOf(alice), aliceDaiBalanceBeforeWithdraw + borrowAmount);
        uint256 aliceDebt = lendingPool.getUserTotalDebt(UILib.computeUserId(aliceUID));
        assertGt(aliceDebt, 0);
    }

    function testAliceBorrowRepayWithdraw() public {
        _setupAliceUSDCandBobDAI();

        // Alice borrows DAI
        uint256 borrowAmount = 400 * 1e18;
        _borrowDAI(aliceUID, borrowAmount);

        // Alice repays part of DAI
        uint256 repayAmount = 150 * 1e18;
        dai.approve(address(lendingPool), repayAmount);
        vm.startPrank(alice);
        lendingPool.repay(address(dai), repayAmount, aliceUID);
        vm.stopPrank();

        uint256 remainingDebt = lendingPool.getUserTotalDebt(UILib.computeUserId(aliceUID));
        assertLt(remainingDebt, borrowAmount);

        // Alice withdraws part of USDC collateral
        uint256 withdrawAmount = 200 * 1e6;
        vm.startPrank(alice);
        lendingPool.withdraw(address(usdc), withdrawAmount, aliceUID);
        vm.stopPrank();

        assertEq(usdc.balanceOf(alice), 10000 * 1e6 - 1000 * 1e6 + withdrawAmount); // started with 10000, supplied 1000, withdrew 200
    }

    function testAliceBorrowsDAIAgainstUSDC() public {
        _setupAliceUSDCandBobDAI();
        uint256 aliceDaiBalanceBeforeWithdraw = dai.balanceOf(alice);

        uint256 daiBorrowAmount = 700 * 1e18; // 70% of collateral

        vm.startPrank(alice);
        lendingPool.borrow(address(dai), daiBorrowAmount, aliceUID);
        vm.stopPrank();

        // Check DAI balance increased
        assertEq(dai.balanceOf(alice), aliceDaiBalanceBeforeWithdraw + daiBorrowAmount);

        // Check debt accounting (scaled to 18 decimals)
        assertEq(lendingPool.getUserTotalDebt(UILib.computeUserId(aliceUID)), daiBorrowAmount);

        // Health factor should be >= 1 since borrow <= LTV
        uint256 hf = lendingPool.getHealthFactor(UILib.computeUserId(aliceUID));
        assertGe(hf, 1e18);
    }

    function testAliceBorrowDAIExceedLTVReverts() public {
        _setupAliceUSDCandBobDAI();

        uint256 daiBorrowAmount = 800 * 1e18; // 80% of collateral > 75% LTV

        vm.startPrank(alice);
        vm.expectRevert("LendingPool: borrow exceeds LTV");
        lendingPool.borrow(address(dai), daiBorrowAmount, aliceUID);
        vm.stopPrank();
    }

    function testAliceRepaysPartialDAIDebt() public {
        _setupAliceUSDCandBobDAI();

        uint256 daiBorrowAmount = 700 * 1e18;

        vm.startPrank(alice);
        lendingPool.borrow(address(dai), daiBorrowAmount, aliceUID);
        vm.stopPrank();

        uint256 repayAmount = 300 * 1e18;

        // Alice approves DAI to lendingPool for repayment
        vm.startPrank(alice);
        dai.approve(address(lendingPool), repayAmount);
        lendingPool.repay(address(dai), repayAmount, aliceUID);
        vm.stopPrank();

        uint256 expectedDebt = daiBorrowAmount - repayAmount;
        assertEq(lendingPool.getUserTotalDebt(UILib.computeUserId(aliceUID)), expectedDebt);
    }

    function testAliceWithdrawUSDCCollateralMaintainsHealthFactor() public {
        _setupAliceUSDCandBobDAI();

        uint256 daiBorrowAmount = 700 * 1e18;
        vm.startPrank(alice);
        lendingPool.borrow(address(dai), daiBorrowAmount, aliceUID);
        vm.stopPrank();

        // Alice tries to withdraw 150 USDC
        uint256 withdrawAmount = 150 * 1e6;

        vm.startPrank(alice);
        lendingPool.withdraw(address(usdc), withdrawAmount, aliceUID);
        vm.stopPrank();

        // Health factor still above 1
        uint256 hf = lendingPool.getHealthFactor(UILib.computeUserId(aliceUID));
        assertGe(hf, 1e18);
    }

    function testAliceWithdrawTooMuchUSDCReverts() public {
        _setupAliceUSDCandBobDAI();

        uint256 daiBorrowAmount = 700 * 1e18;
        vm.startPrank(alice);
        lendingPool.borrow(address(dai), daiBorrowAmount, aliceUID);
        vm.stopPrank();

        // Withdraw amount too large
        uint256 withdrawAmount = 800 * 1e6;

        vm.startPrank(alice);
        vm.expectRevert("LendingPool: withdraw would lower health factor");
        lendingPool.withdraw(address(usdc), withdrawAmount, aliceUID);
        vm.stopPrank();
    }

    function testInterestAccruesOverTimeWithRates() public {
        uint256 supplyAmount = 1_000e6; // 1000 USDC with 6 decimals
        uint256 borrowAmount = 500e6; // 500 USDC borrow
        uint256 partialRepay = 100e6; // 100 USDC partial repay

        // Alice supplies USDC at block.timestamp = 0
        vm.startPrank(alice);
        lendingPool.supply(address(usdc), supplyAmount, aliceUID);
        vm.stopPrank();

        // Bob mints and supplies USDC as collateral
        vm.startPrank(bob);
        usdc.mint(bob, 2_000e6); // Mint 2000 USDC to Bob
        usdc.approve(address(lendingPool), type(uint256).max);
        lendingPool.supply(address(usdc), 1_000e6, bobUID); // Bob supplies 1000 USDC collateral
        vm.stopPrank();

        // Initial liquidity index for USDC should be 1e27 (RAY)
        uint256 initialIndex = poolManager.getLiquidityIndex(address(usdc));
        assertEq(initialIndex, RAY);

        // Log initial borrow and supply rates
        uint256 borrowRateBefore = lendingPool.getCurrentBorrowRate(address(usdc));
        uint256 supplyRateBefore = lendingPool.getCurrentSupplyRate(address(usdc));
        console.log("Initial borrow rate (ray):", borrowRateBefore);
        console.log("Initial supply rate (ray):", supplyRateBefore);

        // Bob borrows 500 USDC at the same block (timestamp 0)
        vm.startPrank(bob);
        lendingPool.borrow(address(usdc), borrowAmount, bobUID);
        vm.stopPrank();

        // Check rates after borrow
        uint256 borrowRateAfterBorrow = lendingPool.getCurrentBorrowRate(address(usdc));
        uint256 supplyRateAfterBorrow = lendingPool.getCurrentSupplyRate(address(usdc));
        console.log("Borrow rate after borrow (ray):", borrowRateAfterBorrow);
        console.log("Supply rate after borrow (ray):", supplyRateAfterBorrow);

        // Expect borrow rate and supply rate to increase after borrow
        assertGt(borrowRateAfterBorrow, borrowRateBefore);
        assertGt(supplyRateAfterBorrow, supplyRateBefore);

        // Fast forward 1 day (86400 seconds)
        vm.warp(block.timestamp + 86400);

        // Manually trigger updateLiquidityIndex by doing a supply
        vm.startPrank(alice);
        lendingPool.supply(address(usdc), 1e6, aliceUID); // small supply to trigger update
        vm.stopPrank();

        uint256 updatedIndex = poolManager.getLiquidityIndex(address(usdc));
        assertTrue(updatedIndex > initialIndex, "Liquidity index should increase over time");

        // Check rates after 1 day and index update
        uint256 borrowRateAfterTime = lendingPool.getCurrentBorrowRate(address(usdc));
        uint256 supplyRateAfterTime = lendingPool.getCurrentSupplyRate(address(usdc));
        console.log("Borrow rate after time (ray):", borrowRateAfterTime);
        console.log("Supply rate after time (ray):", supplyRateAfterTime);

        // Rates should go down as supply went up
        assertLt(borrowRateAfterTime, borrowRateAfterBorrow); // Utilization went down
        assertLt(supplyRateAfterTime, supplyRateAfterBorrow); // So supply rate also down

        // Bob repays partial after 1 day
        vm.startPrank(bob);
        usdc.mint(bob, partialRepay); // Mint 100 USDC for Bob to repay
        usdc.approve(address(lendingPool), partialRepay);
        uint256 actualRepaid = lendingPool.repay(address(usdc), partialRepay, bobUID);
        vm.stopPrank();

        assertGt(actualRepaid, 0);

        // Check rates after repay
        uint256 borrowRateAfterRepay = lendingPool.getCurrentBorrowRate(address(usdc));
        uint256 supplyRateAfterRepay = lendingPool.getCurrentSupplyRate(address(usdc));
        console.log("Borrow rate after repay (ray):", borrowRateAfterRepay);
        console.log("Supply rate after repay (ray):", supplyRateAfterRepay);

        // Expect rates to drop or stay same after repay
        assertLe(borrowRateAfterRepay, borrowRateAfterTime);
        assertLe(supplyRateAfterRepay, supplyRateAfterTime);
    }

    function testMultipleBlocksBorrowAndRepayWithSupplies() public {
        uint256 aliceSupplyAmount = 10_000e6; // 10,000 USDC
        uint256 bobSupplyAmount = 5_000e6; // 5,000 USDC

        // Both Alice and Bob supply before borrowing
        vm.startPrank(alice);
        lendingPool.supply(address(usdc), aliceSupplyAmount, aliceUID);
        vm.stopPrank();

        vm.startPrank(bob);
        lendingPool.supply(address(usdc), bobSupplyAmount, bobUID);
        vm.stopPrank();

        // Bob borrows 1,000 USDC at block 0
        vm.startPrank(bob);
        lendingPool.borrow(address(usdc), 1_000e6, bobUID);
        vm.stopPrank();

        // Advance time 12 hours
        vm.warp(block.timestamp + 12 hours);

        // Bob repays 500 USDC partial borrow
        vm.startPrank(bob);
        usdc.mint(bob, 500e6);
        usdc.approve(address(lendingPool), 500e6);
        lendingPool.repay(address(usdc), 500e6, bobUID);
        vm.stopPrank();

        // Bob's debt after partial repay (should be > 0)
        uint256 debtAfterPartialRepay = lendingPool.getUserTotalDebt(UILib.computeUserId(bobUID));
        assertGt(debtAfterPartialRepay, 0);

        // Advance time 12 hours more
        vm.warp(block.timestamp + 12000000 hours);

        // Bob repays rest of debt (mint more than owed to be safe)
        uint256 remainingDebt = lendingPool.getUserTotalDebt(UILib.computeUserId(bobUID));
        uint256 repayAmount = remainingDebt / 1e12 + 100e6; // extra 100 USDC for safety

        vm.startPrank(bob);
        usdc.mint(bob, repayAmount);
        usdc.approve(address(lendingPool), repayAmount);
        uint256 actualRepaid = lendingPool.repay(address(usdc), repayAmount, bobUID);
        vm.stopPrank();

        // Check how much Alice can withdraw now based on shares and liquidity index
        uint256 maxWithdrawable = lendingPool.getMaxWithdrawableByShares(UILib.computeUserId(aliceUID), address(usdc));
        assertGe(maxWithdrawable, aliceSupplyAmount - 5);

        // Now Alice withdraws all max withdrawable amount
        vm.startPrank(alice);
        uint256 aliceBalanceBeforeWithdraw = usdc.balanceOf(alice);

        uint256 withdrawnAmount = lendingPool.withdraw(address(usdc), maxWithdrawable, aliceUID);

        uint256 aliceBalanceAfterWithdraw = usdc.balanceOf(alice);
        vm.stopPrank();

        // Alice should receive at least what she supplied, likely more due to interest earned
        assertGe(withdrawnAmount, aliceSupplyAmount - 1);
        assertGe(aliceBalanceAfterWithdraw, aliceBalanceBeforeWithdraw + withdrawnAmount);

        // Also check total repaid by Bob is more than principal due to interest
        assertGt(actualRepaid, 500e6); // Bob borrowed 1,000 but repaid more due to interest
    }

    function testInterestAccrualOverTime() public {
        uint256 supplyAmountAlice = 1000e6;
        uint256 supplyAmountBob = 1000e6;
        uint256 borrowAmountBob = 500e6;

        // Alice supplies USDC as collateral
        vm.startPrank(alice);
        lendingPool.supply(address(usdc), supplyAmountAlice, aliceUID);
        vm.stopPrank();

        // Mint and approve Bob's tokens so he can supply collateral
        usdc.mint(bob, supplyAmountBob);
        vm.startPrank(bob);
        usdc.approve(address(lendingPool), supplyAmountBob);
        lendingPool.supply(address(usdc), supplyAmountBob, bobUID);

        // Bob borrows some USDC
        lendingPool.borrow(address(usdc), borrowAmountBob, bobUID);
        vm.stopPrank();

        // Fast forward 1 day
        vm.warp(block.timestamp + 1 days);

        // Trigger liquidity index update by a small supply from Alice
        vm.startPrank(alice);
        lendingPool.supply(address(usdc), 1e6, aliceUID);
        vm.stopPrank();

        uint256 updatedIndex = poolManager.getLiquidityIndex(address(usdc));
        assertTrue(updatedIndex > 1e27, "Liquidity index should have increased due to interest");
    }

    function testInterestPortionOnPartialRepay() public {
        uint256 supplyAmountAlice = 10_000e6;
        uint256 supplyAmountBob = 10_000e6;
        uint256 borrowAmountBob = 5_000e6;
        uint256 partialRepay = 2_000e6;

        vm.startPrank(alice);
        lendingPool.supply(address(usdc), supplyAmountAlice, aliceUID);
        vm.stopPrank();

        usdc.mint(bob, supplyAmountBob);
        vm.startPrank(bob);
        usdc.approve(address(lendingPool), supplyAmountBob);
        lendingPool.supply(address(usdc), supplyAmountBob, bobUID);
        lendingPool.borrow(address(usdc), borrowAmountBob, bobUID);
        vm.stopPrank();

        vm.warp(block.timestamp + 12 hours);

        // Mint Bob tokens to repay partial amount
        usdc.mint(bob, partialRepay);
        vm.startPrank(bob);
        usdc.approve(address(lendingPool), partialRepay);
        uint256 repaid = lendingPool.repay(address(usdc), partialRepay, bobUID);
        vm.stopPrank();

        assertGt(repaid, 0, "Partial repay should be successful");
    }

    function testMultipleBorrowsRepaysWithInterest() public {
        uint256 supplyAmountAlice = 1500e6;
        uint256 supplyAmountBob = 1000e6;

        vm.startPrank(alice);
        lendingPool.supply(address(usdc), supplyAmountAlice, aliceUID);
        vm.stopPrank();

        usdc.mint(bob, supplyAmountBob);
        vm.startPrank(bob);
        usdc.approve(address(lendingPool), supplyAmountBob);
        lendingPool.supply(address(usdc), supplyAmountBob, bobUID);
        lendingPool.borrow(address(usdc), 300e6, bobUID);
        vm.stopPrank();

        vm.warp(block.timestamp + 1 days);

        usdc.mint(bob, 1_500e6);
        vm.startPrank(bob);
        usdc.approve(address(lendingPool), 150e6);
        lendingPool.repay(address(usdc), 150e6, bobUID);
        lendingPool.borrow(address(usdc), 200e6, bobUID);
        vm.stopPrank();

        vm.warp(block.timestamp + 1 days);

        usdc.mint(bob, 3_000e6);
        vm.startPrank(bob);
        usdc.approve(address(lendingPool), 300e6);
        lendingPool.repay(address(usdc), 300e6, bobUID);
        vm.stopPrank();

        // Check Bob's debt is reduced appropriately
        uint256 debtAfter = lendingPool.getUserTotalDebt(UILib.computeUserId(bobUID));
        assertLt(debtAfter, 300e18, "Bob's debt should be less after partial repays");
    }

    function testRatesChangeOverTime() public {
        uint256 supplyAmountAlice = 10_00e6;
        uint256 supplyAmountBob = 10_00e6;
        uint256 borrowAmountBob = 5_00e6;

        vm.startPrank(alice);
        lendingPool.supply(address(usdc), supplyAmountAlice, aliceUID);
        vm.stopPrank();

        usdc.mint(bob, supplyAmountBob);
        vm.startPrank(bob);
        usdc.approve(address(lendingPool), supplyAmountBob);
        lendingPool.supply(address(usdc), supplyAmountBob, bobUID);
        lendingPool.borrow(address(usdc), borrowAmountBob, bobUID);
        vm.stopPrank();

        uint256 borrowRateBefore = lendingPool.getCurrentBorrowRate(address(usdc));
        uint256 supplyRateBefore = lendingPool.getCurrentSupplyRate(address(usdc));

        assertGt(borrowRateBefore, 0, "Borrow rate should be positive after borrow");
        assertGt(supplyRateBefore, 0, "Supply rate should be positive after borrow");

        vm.warp(block.timestamp + 1 days);

        vm.startPrank(alice);
        lendingPool.supply(address(usdc), 1e6, aliceUID); // trigger update
        vm.stopPrank();

        uint256 borrowRateAfter = lendingPool.getCurrentBorrowRate(address(usdc));
        uint256 supplyRateAfter = lendingPool.getCurrentSupplyRate(address(usdc));

        assertLe(borrowRateAfter, borrowRateBefore, "Borrow rate should decrease or stay same over time");
        assertLe(supplyRateAfter, supplyRateBefore, "Supply rate should decrease or stay same over time");
    }
}
