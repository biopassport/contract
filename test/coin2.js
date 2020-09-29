"use strict"

var BiotCoin = artifacts.require("./BiotCoin.sol");
const theBN = require("bn.js")

/**
 * BiotCoin contract tests 2
 */
contract('BiotCoin2', function(accounts) {
  const BIG = (v) => new theBN.BN(v)

  const owner = accounts[0];
  const admin = accounts[1];
  const vault = accounts[2];
  const minter = accounts[0];

  const user1 = accounts[4];
  const user2 = accounts[5];
  const user3 = accounts[6];
  const user4 = accounts[7];
  const user5 = accounts[8];

  let coin, OneBiotCoinInMinunit, NoOfTokens, NoOfTokensInMinunit;

  const bnBalanceOf = async addr => await coin.balanceOf(addr);
  const bnReserveOf = async addr => await coin.reserveOf(addr);
  const bnAllowanceOf = async (owner, spender) => await coin.allowance(owner, spender);

  const balanceOf = async addr => (await coin.balanceOf(addr)).toString();
  const reserveOf = async addr => (await coin.reserveOf(addr)).toString();
  const allowanceOf = async (owner, spender) => (await coin.allowance(owner,spender)).toString();


  before(async () => {
    coin = await BiotCoin.deployed();
    NoOfTokensInMinunit = await coin.totalSupply();
    OneBiotCoinInMinunit = await coin.getOneBiotCoin();
    NoOfTokens = NoOfTokensInMinunit.div(OneBiotCoinInMinunit)
  });

  const clearUser = async user => {
    await coin.setReserve(user, 0, {from: admin});
    await coin.transfer(vault, await bnBalanceOf(user), {from: user});
  };

  beforeEach(async () => {
    await clearUser(user1);
    await clearUser(user2);
    await clearUser(user3);
    await clearUser(user4);
    await clearUser(user5);
  });

  it("reserve and then approve", async() => {
    assert.equal(await balanceOf(user4), "0");

    const OneBiotTimesTwoInMinunit = OneBiotCoinInMinunit.mul(BIG(2))
    const OneBiotTimesTwoInMinunitStr = OneBiotTimesTwoInMinunit.toString()

    const OneBiotTimesOneInMinunit = OneBiotCoinInMinunit.mul(BIG(1))
    const OneBiotTimesOneInMinunitStr = OneBiotTimesOneInMinunit.toString()

    // send 2 Biot to user4 and set 1 Biot reserve
    coin.transfer(user4, OneBiotTimesTwoInMinunit, {from: vault});
    coin.setReserve(user4, OneBiotCoinInMinunit, {from: admin});
    assert.equal(await balanceOf(user4), OneBiotTimesTwoInMinunitStr);
    assert.equal(await reserveOf(user4), OneBiotCoinInMinunit.toString());

    // approve 2 Biot to user5
    await coin.approve(user5, OneBiotTimesTwoInMinunit, {from:user4});
    assert.equal(await allowanceOf(user4, user5), OneBiotTimesTwoInMinunitStr);

    // transfer 2 Biot from user4 to user5 SHOULD NOT BE POSSIBLE
    try {
      await coin.transferFrom(user4, user5, OneBiotTimesTwoInMinunit, {from: user5});
      assert.fail();
    } catch(exception) {
      assert.isTrue(exception.message.includes("revert"));
    }

    // transfer 1 Biot from user4 to user5 SHOULD BE POSSIBLE
    await coin.transferFrom(user4, user5, OneBiotTimesOneInMinunit, {from: user5});
    assert.equal(await balanceOf(user4), OneBiotTimesOneInMinunitStr);
    assert.equal(await reserveOf(user4), OneBiotTimesOneInMinunitStr); // reserve will not change
    assert.equal(await allowanceOf(user4, user5), OneBiotTimesOneInMinunitStr); // allowance will be reduced
    assert.equal(await balanceOf(user5), OneBiotTimesOneInMinunitStr);
    assert.equal(await reserveOf(user5), "0");

    // transfer .5 Biot from user4 to user5 SHOULD NOT BE POSSIBLE if balance <= reserve
    const halfBiotInMinunit = OneBiotCoinInMinunit.div(BIG(2));
    try {
      await coin.transferFrom(user4, user5, halfBiotInMinunit, {from: user5});
      assert.fail();
    } catch(exception) {
      assert.isTrue(exception.message.includes("revert"));
    }
  })

  it("only minter can call mint", async() => {
      const OneBiotTimesTenInMinunit = OneBiotCoinInMinunit.mul(BIG(10))
      const OneBiotTimesTenInMinunitStr = OneBiotTimesTenInMinunit.toString()

      assert.equal(await balanceOf(user4), "0");

      await coin.mint(user4, OneBiotTimesTenInMinunit, {from: minter})

      const totalSupplyAfterMintStr = (await coin.totalSupply()).toString()
      assert.equal(totalSupplyAfterMintStr, OneBiotTimesTenInMinunit.add(NoOfTokensInMinunit).toString())
      assert.equal(await balanceOf(user4), OneBiotTimesTenInMinunitStr);

      try {
          await coin.mint(user4, OneBiotTimesTenInMinunit, {from: user4})
          assert.fail();
      } catch(exception) {
          assert.equal(totalSupplyAfterMintStr, OneBiotTimesTenInMinunit.add(NoOfTokensInMinunit).toString())
          assert.isTrue(exception.message.includes("revert"));
      }
  })

  it("cannot mint above the mint cap", async() => {
      const OneBiotTimes100BilInMinunit = 
              OneBiotCoinInMinunit.mul(BIG(100000000000))

      assert.equal(await balanceOf(user4), "0");


      try {
          await coin.mint(user4, OneBiotTimes100BilInMinunit, {from: minter})
          assert.fail();
      } catch(exception) {
          assert.isTrue(exception.message.includes("revert"));
      }
  })
});
