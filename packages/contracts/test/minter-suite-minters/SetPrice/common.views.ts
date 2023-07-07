import { constants } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { T_Config, isERC20Minter } from "../../util/common";
import { Common_Views } from "../common.views";

/**
 * These tests are intended to check common views Minter functionality
 * for set price minters in our minter suite.
 * @dev assumes common BeforeEach to populate accounts, constants, and setup
 */
export const SetPrice_Common_Views = async (
  _beforeEach: () => Promise<T_Config>
) => {
  describe("Common Minter Views Tests", async function () {
    await Common_Views(_beforeEach);
  });

  describe("getPriceInfo", async function () {
    it("should return proper response when not configured", async function () {
      const config = await loadFixture(_beforeEach);
      let result = await config.minter.getPriceInfo(
        config.projectZero,
        config.genArt721Core.address
      );
      const isERC20 = isERC20Minter(config.minter);
      const expectedSymbol = isERC20 ? "ERC20" : "ETH";
      const expectedAddress = isERC20
        ? config.ERC20.address
        : constants.ZERO_ADDRESS;
      expect(result[0]).to.equal(false);
      expect(result[1]).to.equal(0);
      expect(result[2]).to.equal(expectedSymbol);
      expect(result[3]).to.equal(expectedAddress);
    });

    it("should return proper response when configured", async function () {
      const config = await loadFixture(_beforeEach);
      await config.minter
        .connect(config.accounts.artist)
        .updatePricePerTokenInWei(
          config.projectZero,
          config.genArt721Core.address,
          config.pricePerTokenInWei
        );
      let result = await config.minter.getPriceInfo(
        config.projectZero,
        config.genArt721Core.address
      );
      const isERC20 = isERC20Minter(config.minter);
      const expectedSymbol = isERC20 ? "ERC20" : "ETH";
      const expectedAddress = isERC20
        ? config.ERC20.address
        : constants.ZERO_ADDRESS;
      expect(result[0]).to.equal(true);
      expect(result[1]).to.equal(config.pricePerTokenInWei);
      expect(result[2]).to.equal(expectedSymbol);
      expect(result[3]).to.equal(expectedAddress);
    });
  });
};
