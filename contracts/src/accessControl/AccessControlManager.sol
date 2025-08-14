// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title Access Control Manager for Protocol Roles
/// @notice Manages roles and permissions across the protocol
contract AccessControlManager is AccessControl {
    bytes32 public constant POOL_ADMIN_ROLE = keccak256("POOL_ADMIN_ROLE");
    bytes32 public constant RISK_ADMIN_ROLE = keccak256("RISK_ADMIN_ROLE");
    bytes32 public constant POOL_MANAGER_ROLE = keccak256("POOL_MANAGER_ROLE");
    bytes32 public constant EMERGENCY_ADMIN_ROLE = keccak256("EMERGENCY_ADMIN_ROLE");

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(POOL_ADMIN_ROLE, msg.sender);
        _grantRole(RISK_ADMIN_ROLE, msg.sender);
        _grantRole(POOL_MANAGER_ROLE, msg.sender);
        _grantRole(EMERGENCY_ADMIN_ROLE, msg.sender);
    }

    function isPoolAdmin(address account) external view returns (bool) {
        return hasRole(POOL_ADMIN_ROLE, account);
    }

    function isRiskAdmin(address account) external view returns (bool) {
        return hasRole(RISK_ADMIN_ROLE, account);
    }

    function isPoolManager(address account) external view returns (bool) {
        return hasRole(POOL_MANAGER_ROLE, account);
    }

    function isEmergencyAdmin(address account) external view returns (bool) {
        return hasRole(EMERGENCY_ADMIN_ROLE, account);
    }
}
