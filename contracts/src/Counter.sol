// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract Counter is Ownable {
    uint256 public number;
    AggregatorV3Interface public immutable priceFeed;

    constructor(address feed) Ownable(msg.sender) {
        priceFeed = AggregatorV3Interface(feed);
    }

    function increment() external {
        number += 1;
    }

    function latestAnswer() external view returns (int256) {
        (, int256 answer,,,) = priceFeed.latestRoundData();
        return answer;
    }
}
