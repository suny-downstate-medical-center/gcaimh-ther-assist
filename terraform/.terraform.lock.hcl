# Copyright 2025 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# This file is maintained automatically by "terraform init".
# Manual edits may be lost in future updates.

provider "registry.terraform.io/hashicorp/archive" {
  version     = "2.7.1"
  constraints = "~> 2.4"
  hashes = [
    "h1:A7EnRBVm4h9ryO9LwxYnKr4fy7ExPMwD5a1DsY7m1Y0=",
    "zh:19881bb356a4a656a865f48aee70c0b8a03c35951b7799b6113883f67f196e8e",
    "zh:2fcfbf6318dd514863268b09bbe19bfc958339c636bcbcc3664b45f2b8bf5cc6",
    "zh:3323ab9a504ce0a115c28e64d0739369fe85151291a2ce480d51ccbb0c381ac5",
    "zh:362674746fb3da3ab9bd4e70c75a3cdd9801a6cf258991102e2c46669cf68e19",
    "zh:7140a46d748fdd12212161445c46bbbf30a3f4586c6ac97dd497f0c2565fe949",
    "zh:78d5eefdd9e494defcb3c68d282b8f96630502cac21d1ea161f53cfe9bb483b3",
    "zh:875e6ce78b10f73b1efc849bfcc7af3a28c83a52f878f503bb22776f71d79521",
    "zh:b872c6ed24e38428d817ebfb214da69ea7eefc2c38e5a774db2ccd58e54d3a22",
    "zh:cd6a44f731c1633ae5d37662af86e7b01ae4c96eb8b04144255824c3f350392d",
    "zh:e0600f5e8da12710b0c52d6df0ba147a5486427c1a2cc78f31eea37a47ee1b07",
    "zh:f21b2e2563bbb1e44e73557bcd6cdbc1ceb369d471049c40eb56cb84b6317a60",
    "zh:f752829eba1cc04a479cf7ae7271526b402e206d5bcf1fcce9f535de5ff9e4e6",
  ]
}

provider "registry.terraform.io/hashicorp/google" {
  version     = "5.45.2"
  constraints = "~> 5.0"
  hashes = [
    "h1:iy2Q9VcnMu4z/bH3v/NmI/nEpgYY7bXgJmT/hVTAUS4=",
    "zh:0d09c8f20b556305192cdbe0efa6d333ceebba963a8ba91f9f1714b5a20c4b7a",
    "zh:117143fc91be407874568df416b938a6896f94cb873f26bba279cedab646a804",
    "zh:16ccf77d18dd2c5ef9c0625f9cf546ebdf3213c0a452f432204c69feed55081e",
    "zh:3e555cf22a570a4bd247964671f421ed7517970cd9765ceb46f335edc2c6f392",
    "zh:688bd5b05a75124da7ae6e885b2b92bd29f4261808b2b78bd5f51f525c1052ca",
    "zh:6db3ef37a05010d82900bfffb3261c59a0c247e0692049cb3eb8c2ef16c9d7bf",
    "zh:70316fde75f6a15d72749f66d994ccbdde5f5ed4311b6d06b99850f698c9bbf9",
    "zh:84b8e583771a4f2bd514e519d98ed7fd28dce5efe0634e973170e1cfb5556fb4",
    "zh:9d4b8ef0a9b6677935c604d94495042e68ff5489932cfd1ec41052e094a279d3",
    "zh:a2089dd9bd825c107b148dd12d6b286f71aa37dfd4ca9c35157f2dcba7bc19d8",
    "zh:f03d795c0fd9721e59839255ee7ba7414173017dc530b4ce566daf3802a0d6dd",
    "zh:f569b65999264a9416862bca5cd2a6177d94ccb0424f3a4ef424428912b9cb3c",
  ]
}

provider "registry.terraform.io/hashicorp/google-beta" {
  version     = "5.45.2"
  constraints = "~> 5.0"
  hashes = [
    "h1:ME/cVZGNln4h166gyo9r7CuunzZ3FEqlIaNyQ0e9yjE=",
    "zh:16b77bac5d1555b7f066ba8014f4fc8a6d0de64e252a1988d3fbb400984a4b19",
    "zh:1b13f515c4809343840aed8265915cc4191f138bdab5a8c5e1f542fdfc69989f",
    "zh:1dcce4309aeab7c88fd36aea664d57e620d8a413b967ce513a5a866e8de901f2",
    "zh:24db65d7929f2a731e9cac1750c569cb4528b312ef182a5e2e8c0cf008d8a71b",
    "zh:28c0b9e68d97570f03b2c4770607701580055bcba50069efd145954aa13b23e4",
    "zh:3a898a1ad1569f6486a2bc20014087284c8cab919bc8f155833de5128ccd12eb",
    "zh:4eed99cfb9daada70f813f2cedcf490d3097de1ccb9b391fc451ecc46509c067",
    "zh:888c4cb1f13b23674ba1091835dd3f1bff5d8e7729ef302183d8d01233819e54",
    "zh:8baae3b949f6e9505425f5fa4785de786e9cedc4c3f3ad906d8ed560bd2e39c6",
    "zh:cf2c8928b764592fa2cd14a9f109d01cd0a92049a4fca9d0a74cf2fe588364e2",
    "zh:edff09394f5bd0b278a4adc800a31b7f150249a1ea92ca273ccf4acd25be3f63",
    "zh:f569b65999264a9416862bca5cd2a6177d94ccb0424f3a4ef424428912b9cb3c",
  ]
}

provider "registry.terraform.io/hashicorp/local" {
  version     = "2.5.3"
  constraints = "~> 2.4"
  hashes = [
    "h1:MCzg+hs1/ZQ32u56VzJMWP9ONRQPAAqAjuHuzbyshvI=",
    "zh:284d4b5b572eacd456e605e94372f740f6de27b71b4e1fd49b63745d8ecd4927",
    "zh:40d9dfc9c549e406b5aab73c023aa485633c1b6b730c933d7bcc2fa67fd1ae6e",
    "zh:6243509bb208656eb9dc17d3c525c89acdd27f08def427a0dce22d5db90a4c8b",
    "zh:78d5eefdd9e494defcb3c68d282b8f96630502cac21d1ea161f53cfe9bb483b3",
    "zh:885d85869f927853b6fe330e235cd03c337ac3b933b0d9ae827ec32fa1fdcdbf",
    "zh:bab66af51039bdfcccf85b25fe562cbba2f54f6b3812202f4873ade834ec201d",
    "zh:c505ff1bf9442a889ac7dca3ac05a8ee6f852e0118dd9a61796a2f6ff4837f09",
    "zh:d36c0b5770841ddb6eaf0499ba3de48e5d4fc99f4829b6ab66b0fab59b1aaf4f",
    "zh:ddb6a407c7f3ec63efb4dad5f948b54f7f4434ee1a2607a49680d494b1776fe1",
    "zh:e0dafdd4500bec23d3ff221e3a9b60621c5273e5df867bc59ef6b7e41f5c91f6",
    "zh:ece8742fd2882a8fc9d6efd20e2590010d43db386b920b2a9c220cfecc18de47",
    "zh:f4c6b3eb8f39105004cf720e202f04f57e3578441cfb76ca27611139bc116a82",
  ]
}

provider "registry.terraform.io/hashicorp/null" {
  version = "3.2.4"
  hashes = [
    "h1:L5V05xwp/Gto1leRryuesxjMfgZwjb7oool4WS1UEFQ=",
    "zh:59f6b52ab4ff35739647f9509ee6d93d7c032985d9f8c6237d1f8a59471bbbe2",
    "zh:78d5eefdd9e494defcb3c68d282b8f96630502cac21d1ea161f53cfe9bb483b3",
    "zh:795c897119ff082133150121d39ff26cb5f89a730a2c8c26f3a9c1abf81a9c43",
    "zh:7b9c7b16f118fbc2b05a983817b8ce2f86df125857966ad356353baf4bff5c0a",
    "zh:85e33ab43e0e1726e5f97a874b8e24820b6565ff8076523cc2922ba671492991",
    "zh:9d32ac3619cfc93eb3c4f423492a8e0f79db05fec58e449dee9b2d5873d5f69f",
    "zh:9e15c3c9dd8e0d1e3731841d44c34571b6c97f5b95e8296a45318b94e5287a6e",
    "zh:b4c2ab35d1b7696c30b64bf2c0f3a62329107bd1a9121ce70683dec58af19615",
    "zh:c43723e8cc65bcdf5e0c92581dcbbdcbdcf18b8d2037406a5f2033b1e22de442",
    "zh:ceb5495d9c31bfb299d246ab333f08c7fb0d67a4f82681fbf47f2a21c3e11ab5",
    "zh:e171026b3659305c558d9804062762d168f50ba02b88b231d20ec99578a6233f",
    "zh:ed0fe2acdb61330b01841fa790be00ec6beaac91d41f311fb8254f74eb6a711f",
  ]
}

provider "registry.terraform.io/hashicorp/time" {
  version     = "0.13.1"
  constraints = "~> 0.9"
  hashes = [
    "h1:ZT5ppCNIModqk3iOkVt5my8b8yBHmDpl663JtXAIRqM=",
    "zh:02cb9aab1002f0f2a94a4f85acec8893297dc75915f7404c165983f720a54b74",
    "zh:04429b2b31a492d19e5ecf999b116d396dac0b24bba0d0fb19ecaefe193fdb8f",
    "zh:26f8e51bb7c275c404ba6028c1b530312066009194db721a8427a7bc5cdbc83a",
    "zh:772ff8dbdbef968651ab3ae76d04afd355c32f8a868d03244db3f8496e462690",
    "zh:78d5eefdd9e494defcb3c68d282b8f96630502cac21d1ea161f53cfe9bb483b3",
    "zh:898db5d2b6bd6ca5457dccb52eedbc7c5b1a71e4a4658381bcbb38cedbbda328",
    "zh:8de913bf09a3fa7bedc29fec18c47c571d0c7a3d0644322c46f3aa648cf30cd8",
    "zh:9402102c86a87bdfe7e501ffbb9c685c32bbcefcfcf897fd7d53df414c36877b",
    "zh:b18b9bb1726bb8cfbefc0a29cf3657c82578001f514bcf4c079839b6776c47f0",
    "zh:b9d31fdc4faecb909d7c5ce41d2479dd0536862a963df434be4b16e8e4edc94d",
    "zh:c951e9f39cca3446c060bd63933ebb89cedde9523904813973fbc3d11863ba75",
    "zh:e5b773c0d07e962291be0e9b413c7a22c044b8c7b58c76e8aa91d1659990dfb5",
  ]
}
