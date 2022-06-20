const hre = require("hardhat");
const factoryABI = require("../artifacts/contracts/CollectionFactory.sol/CollectionFactory.json");
const collectionABIV1 = require("../artifacts/contracts/ToknCollectionInit.sol/ToknCollection.json");
const collectionABI = require("../artifacts/contracts/ToknCollectionV2.sol/ToknCollectionV2.json");

const ethers = hre.ethers;
async function main() {
  //getting signer
  const [signer] = await ethers.getSigners();

  // Geting all The compiled contracts
  const collectionV2 = await ethers.getContractFactory("ToknCollectionV2");
  const CollectionUpgraded = await collectionV2.deploy();
  CollectionUpgraded.deployed();
  // const ImplementationV2Contract = await ethers.getContractFactory("Impv2");
  console.log(
    "Upgraded Implementation deployed at: ",
    CollectionUpgraded.address
  );
  const Factory = new ethers.Contract(process.argv[2], factoryABI.abi, signer);
  // var artist = ethers.utils.getAddress(process.argv[0]);
  // console.log(process.argv[2]);
  console.log("Factory at", Factory.address);
  var ProxyImpAddress = await Factory.getArtistProxy(process.argv[3]);

  console.log("Proxy at:", ProxyImpAddress);
  // Deploying Proxy contract
  var ProxyImp = new ethers.Contract(
    ProxyImpAddress,
    collectionABIV1.abi,
    signer
  );
  console.log("ProxyImp:", ProxyImp.address);
  // console.log("lulll");

  const CollectionUpgradedInterface = new ethers.utils.Interface(
    collectionABI.abi
  );
  const fragment = CollectionUpgradedInterface.getFunction("initializeState");
  const data = CollectionUpgradedInterface.encodeFunctionData(fragment, [
    process.argv[4],
    process.argv[3],
  ]);
  // console.log("Encoded data: " + data);
  // var gas = await CollectionUpgraded.estimateGas.initializeState(
  //   process.argv[4],
  //   process.argv[3]
  // );
  // console.log("Gas estimated: " + gas);
  // const options = { value: gas / 10 ** 9 };
  var tx = await ProxyImp.upgradeTo(CollectionUpgraded.address);
  console.log("chlja bhaiiii");
  await tx.wait();
  var ProxyImp = new ethers.Contract(
    ProxyImpAddress,
    collectionABI.abi,
    signer
  );
  var tx = await ProxyImp.initializeState(process.argv[4], process.argv[3]);
  await tx.wait();
  var uri = await ProxyImp.uri(0);
  console.log("Uri: ", uri);

  // to see changes happen on Etherscan we would have to verify both proxy and implementation
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
