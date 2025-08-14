// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../accessControl/AccessControlManager.sol";

/// @title Base Contract for Protocol
/// @notice Implements basic shared functionality across protocol contracts
abstract contract BaseContract {
    AccessControlManager public immutable ACM;

    constructor(address _acm) {
        require(_acm != address(0), "Invalid ACM address");
        ACM = AccessControlManager(_acm);
    }

    modifier onlyPoolAdmin() {
        require(ACM.isPoolAdmin(msg.sender), "Caller is not pool admin");
        _;
    }

    modifier onlyRiskAdmin() {
        require(ACM.isRiskAdmin(msg.sender), "Caller is not risk admin");
        _;
    }

    modifier onlyPoolManager() {
        require(ACM.isPoolManager(msg.sender), "Caller is not pool manager");
        _;
    }

    modifier onlyEmergencyAdmin() {
        require(ACM.isEmergencyAdmin(msg.sender), "Caller is not emergency admin");
        _;
    }
}
