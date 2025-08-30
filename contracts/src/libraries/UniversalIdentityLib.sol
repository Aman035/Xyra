// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @title Universal Identity Library
/// @notice Provides a universal identity abstraction across chains
library UniversalIdentityLib {
    /// @dev Represents a cross-chain user identity
    struct UniversalIdentity {
        uint256 chainId;
        bytes identity;
    }

    /// @notice Computes a universal user ID from chainId and identity
    /// @param chainId The source chain ID
    /// @param identity The user identity (address, pubkey, etc.) in bytes
    /// @return userId A keccak256 hash of chainId and identity
    function computeUserId(
        uint256 chainId,
        bytes memory identity
    ) internal pure returns (bytes32) {
        return keccak256(abi.encode(chainId, identity));
    }

    /// @notice Computes a universal user ID from a UniversalIdentity struct
    /// @param user The universal identity struct
    /// @return userId A keccak256 hash of chainId and identity
    function computeUserId(
        UniversalIdentity memory user
    ) internal pure returns (bytes32) {
        return computeUserId(user.chainId, user.identity);
    }

    /// @notice Creates a UniversalIdentity struct from a chainId and identity
    /// @param chainId The source chain ID
    /// @param identity The user identity in bytes
    /// @return user The UniversalIdentity struct
    function toUniversalIdentity(
        uint256 chainId,
        bytes memory identity
    ) internal pure returns (UniversalIdentity memory) {
        return UniversalIdentity({chainId: chainId, identity: identity});
    }

    /// @notice Creates a UniversalIdentity struct from a chainId and EVM address
    /// @param chainId The source chain ID
    /// @param user The address to convert to bytes
    /// @return user The UniversalIdentity struct
    function toUniversalIdentity(
        uint256 chainId,
        address user
    ) internal pure returns (UniversalIdentity memory) {
        return
            UniversalIdentity({
                chainId: chainId,
                identity: abi.encodePacked(user)
            });
    }
}
