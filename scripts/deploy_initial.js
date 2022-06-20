const hre = require("hardhat");
const factoryABI = require("../artifacts/contracts/CollectionFactory.sol/CollectionFactory.json");
const collectionABI = require("../artifacts/contracts/ToknCollectionInit.sol/ToknCollection.json");

const ethers = hre.ethers;
async function main() {
  //getting signer
  const [signer] = await ethers.getSigners();

  // Geting all The compiled contracts
  const FactoryContract = await ethers.getContractFactory("CollectionFactory");
  // const ImplementationV2Contract = await ethers.getContractFactory("Impv2");

  const Factory = await FactoryContract.deploy();
  Factory.deployed();
  console.log("Factory deployed at: ", Factory.address);
  // var artist = ethers.utils.getAddress(process.argv[0]);
  // console.log(process.argv[2]);
  var collectionAddress = await Factory.collection();
  console.log("Collection Address: ", collectionAddress);
  console.log("Loading...");
  var tx = await Factory.createCollection(process.argv[2], process.argv[3]);
  await tx.wait();

  var ProxyImpAddress = await Factory.getArtistProxy(process.argv[2]);

  console.log("Proxy at:", ProxyImpAddress);
  // Deploying Proxy contract
  var ProxyImp = new ethers.Contract(
    ProxyImpAddress,
    collectionABI.abi,
    signer
  );

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
