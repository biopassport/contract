var BiotCoin = artifacts.require("./contracts/BiotCoin.sol");

module.exports = function(deployer, network, accounts) {
  deployer.deploy(BiotCoin, 'BIOT', 'BIOTCoin', accounts[0], accounts[1], accounts[2]).then( () => {
    console.log(`BiotCoin deployed: address = ${BiotCoin.address}`);
  });
};
