//SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "./ToknCollectionInit.sol";

contract CollectionFactory {
   
    mapping(address => address) public artistProxies;
    address[] public artists;
    ToknCollection public collection;

    constructor(){
        collection = new ToknCollection();
    }

    event ProxyCreated(address _proxyAddress, address _artist);

    function createCollection(address _artist, string calldata _uri, string calldata _collectionUri, address _treasury) public {
        
       
        bytes memory encodedSignature = abi.encodeWithSignature("initialize(string,string,address)", _uri, _collectionUri, _treasury);
        ERC1967Proxy newProxy = new ERC1967Proxy(address(collection), encodedSignature);
        if((artistProxies[_artist]) == (address(0))){
            artists.push(_artist);
        }
        ToknCollection(address(newProxy)).transferOwnership(msg.sender);
        artistProxies[_artist] = address(newProxy);
        emit ProxyCreated(address(newProxy), _artist);
    }

    function getArtistProxy(address _artist) public view returns(address){
      return artistProxies[_artist];
    }
    
}
