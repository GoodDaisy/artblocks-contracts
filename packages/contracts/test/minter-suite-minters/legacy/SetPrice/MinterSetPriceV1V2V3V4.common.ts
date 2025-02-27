import { constants, expectRevert } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

import EthersAdapter from "@gnosis.pm/safe-ethers-lib";
import Safe from "@gnosis.pm/safe-core-sdk";
import { SafeTransactionDataPartial } from "@gnosis.pm/safe-core-sdk-types";
import { getGnosisSafe } from "../../../util/GnosisSafeNetwork";
import { isCoreV3, T_Config } from "../../../util/common";

/**
 * These tests are intended to check common MinterSetPriceV1-V4 functionality.
 * The tests are intended to be run on the any MinterSetPriceV1-V4 contract (not the V0 contracts).
 * (config includes V1ERC20 contracts)
 * @dev assumes common BeforeEach to populate accounts, constants, and setup
 */
export const MinterSetPriceV1V2V3V4_Common = async (
  _beforeEach: () => Promise<T_Config>
) => {
  describe("purchaseTo", async function () {
    it("does not support toggling of `purchaseToDisabled`", async function () {
      const config = await loadFixture(_beforeEach);
      await expectRevert(
        config.minter
          .connect(config.accounts.artist)
          .togglePurchaseToDisabled(config.projectZero),
        "Action not supported"
      );
      // still allows `purchaseTo`.
      await config.minter
        .connect(config.accounts.user)
        ["purchaseTo(address,uint256)"](
          config.accounts.artist.address,
          config.projectZero,
          {
            value: config.pricePerTokenInWei,
          }
        );
    });

    it("doesn't support `purchaseTo` toggling", async function () {
      const config = await loadFixture(_beforeEach);
      await expectRevert(
        config.minter
          .connect(config.accounts.artist)
          .togglePurchaseToDisabled(config.projectZero),
        "Action not supported"
      );
    });
  });

  describe("reentrancy attack", async function () {
    it("does not allow reentrant purchaseTo", async function () {
      const config = await loadFixture(_beforeEach);
      // attacker deploys reentrancy contract
      const reentrancyMockFactory =
        await ethers.getContractFactory("ReentrancyMock");
      const reentrancyMock = await reentrancyMockFactory
        .connect(config.accounts.deployer)
        .deploy();
      // attacker should see revert when performing reentrancy attack
      const totalTokensToMint = 2;
      let numTokensToMint = BigNumber.from(totalTokensToMint.toString());
      let totalValue = config.higherPricePerTokenInWei.mul(numTokensToMint);
      await expectRevert(
        reentrancyMock
          .connect(config.accounts.deployer)
          .attack(
            numTokensToMint,
            config.minter.address,
            config.projectZero,
            config.higherPricePerTokenInWei,
            {
              value: totalValue,
            }
          ),
        // failure message occurs during refund, where attack reentrency occurs
        "Refund failed"
      );
      // attacker should be able to purchase ONE token at a time w/refunds
      numTokensToMint = BigNumber.from("1");
      totalValue = config.higherPricePerTokenInWei.mul(numTokensToMint);
      for (let i = 0; i < totalTokensToMint; i++) {
        await reentrancyMock
          .connect(config.accounts.deployer)
          .attack(
            numTokensToMint,
            config.minter.address,
            config.projectZero,
            config.higherPricePerTokenInWei,
            {
              value: config.higherPricePerTokenInWei,
            }
          );
      }
    });
  });

  describe("gnosis safe", async function () {
    it("allows gnosis safe to purchase in ETH", async function () {
      const config = await loadFixture(_beforeEach);
      // deploy new Gnosis Safe
      const safeSdk: Safe = await getGnosisSafe(
        config.accounts.artist,
        config.accounts.additional,
        config.accounts.user
      );
      const safeAddress = safeSdk.getAddress();

      // create a transaction
      const unsignedTx = await config.minter.populateTransaction[
        "purchase(uint256)"
      ](config.projectZero);
      const transaction: SafeTransactionDataPartial = {
        to: config.minter.address,
        data: unsignedTx.data,
        value: config.pricePerTokenInWei.toHexString(),
      };
      const safeTransaction = await safeSdk.createTransaction(transaction);

      // signers sign and execute the transaction
      // artist signs
      await safeSdk.signTransaction(safeTransaction);
      // additional signs
      const ethAdapteruser2 = new EthersAdapter({
        ethers,
        signer: config.accounts.additional,
      });
      const safeSdk2 = await safeSdk.connect({
        ethAdapter: ethAdapteruser2,
        safeAddress,
      });
      const txHash = await safeSdk2.getTransactionHash(safeTransaction);
      const approveTxResponse = await safeSdk2.approveTransactionHash(txHash);
      await approveTxResponse.transactionResponse?.wait();

      // fund the safe and execute transaction
      await config.accounts.artist.sendTransaction({
        to: safeAddress,
        value: config.pricePerTokenInWei,
      });
      const viewFunctionWithInvocations = (await isCoreV3(config.genArt721Core))
        ? config.genArt721Core.projectStateData
        : config.genArt721Core.projectTokenInfo;
      const projectStateDataBefore = await viewFunctionWithInvocations(
        config.projectZero
      );
      const executeTxResponse =
        await safeSdk2.executeTransaction(safeTransaction);
      await executeTxResponse.transactionResponse?.wait();
      const projectStateDataAfter = await viewFunctionWithInvocations(
        config.projectZero
      );
      expect(projectStateDataAfter.invocations).to.be.equal(
        projectStateDataBefore.invocations.add(1)
      );
    });
  });
};
