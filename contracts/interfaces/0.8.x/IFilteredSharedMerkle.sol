// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

pragma solidity ^0.8.0;

/**
 * @title This interface extends the IFilteredMinterV1 interface in order to
 * add support for including Merkle proofs when purchasing.
 * @author Art Blocks Inc.
 */
interface IFilteredSharedMerkle {
    /**
     * @notice Notifies of the contract's default maximum mints allowed per
     * user for a given project, on this minter. This value can be overridden
     * by the artist of any project at any time.
     */
    event DefaultMaxInvocationsPerAddress(
        uint256 defaultMaxInvocationsPerAddress
    );

    // Triggers a purchase of a token from the desired project, to the
    // TX-sending address. Requires Merkle proof.
    function purchase(
        uint256 _projectId,
        uint256 _contractId,
        bytes32[] memory _proof
    ) external payable returns (uint256 tokenId);

    // Triggers a purchase of a token from the desired project, to the specified
    // receiving address. Requires Merkle proof.
    function purchaseTo(
        address _to,
        uint256 _projectId,
        uint256 _contractId,
        bytes32[] memory _proof
    ) external payable returns (uint256 tokenId);

    function updateMerkleRoot(uint256 _projectId, bytes32 _root) external;

    function hashAddress(address _address) external pure returns (bytes32);

    function verifyAddress(
        uint256 _projectId,
        bytes32[] calldata _proof,
        address _address
    ) external view returns (bool);
}
