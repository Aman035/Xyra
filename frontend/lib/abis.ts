// lib/abis.ts
export const ERC20_ABI = [
  {
    type: 'function',
    name: 'decimals',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint8' }],
  },
  {
    type: 'function',
    name: 'symbol',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string' }],
  },
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
] as const

export const LENDING_POOL_ABI = [
  {
    type: 'constructor',
    inputs: [
      {
        name: '_acm',
        type: 'address',
        internalType: 'address',
      },
      {
        name: '_poolManager',
        type: 'address',
        internalType: 'address',
      },
      {
        name: '_interestRateModel',
        type: 'address',
        internalType: 'address',
      },
      {
        name: '_priceOracle',
        type: 'address',
        internalType: 'address',
      },
      {
        name: '_collateralManager',
        type: 'address',
        internalType: 'address',
      },
      {
        name: '_gatewayAddress',
        type: 'address',
        internalType: 'address payable',
      },
      {
        name: '_swap',
        type: 'address',
        internalType: 'address',
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'ACM',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'address',
        internalType: 'contract AccessControlManager',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'COLLATERAL_MANAGER',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'address',
        internalType: 'contract ICollateralManager',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'INTEREST_RATE_MODEL',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'address',
        internalType: 'contract IInterestRateModel',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'LIQUIDATION_THRESHOLD',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'MAX_LIQUIDATION_CLOSE_FACTOR',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'POOL_MANAGER',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'address',
        internalType: 'contract IPoolManager',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'PRICE_ORACLE',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'address',
        internalType: 'contract IPriceOracle',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'RAY',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'SECONDS_PER_YEAR',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: '_calculateUtilization',
    inputs: [
      {
        name: 'asset',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'borrow',
    inputs: [
      {
        name: 'asset',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'amount',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'onBehalfOf',
        type: 'tuple',
        internalType: 'struct UniversalIdentityLib.UniversalIdentity',
        components: [
          {
            name: 'chainId',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'identity',
            type: 'bytes',
            internalType: 'bytes',
          },
        ],
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'collateralManager',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'address',
        internalType: 'contract ICollateralManager',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'gateway',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'address',
        internalType: 'contract GatewayZEVM',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getCurrentBorrowRate',
    inputs: [
      {
        name: 'asset',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getCurrentSupplyRate',
    inputs: [
      {
        name: 'asset',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getHealthFactor',
    inputs: [
      {
        name: 'user',
        type: 'bytes32',
        internalType: 'bytes32',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getMaxWithdrawableByShares',
    inputs: [
      {
        name: 'user',
        type: 'bytes32',
        internalType: 'bytes32',
      },
      {
        name: 'asset',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getTotalBorrowed',
    inputs: [
      {
        name: 'asset',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getTotalSupplied',
    inputs: [
      {
        name: 'asset',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getUserShares',
    inputs: [
      {
        name: 'user',
        type: 'bytes32',
        internalType: 'bytes32',
      },
      {
        name: 'asset',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getUserTotalCollateral',
    inputs: [
      {
        name: 'user',
        type: 'bytes32',
        internalType: 'bytes32',
      },
    ],
    outputs: [
      {
        name: 'totalCollateralUsd',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getUserTotalDebt',
    inputs: [
      {
        name: 'user',
        type: 'bytes32',
        internalType: 'bytes32',
      },
    ],
    outputs: [
      {
        name: 'totalDebtUsd',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getUserUnderlyingBalance',
    inputs: [
      {
        name: 'user',
        type: 'tuple',
        internalType: 'struct UniversalIdentityLib.UniversalIdentity',
        components: [
          {
            name: 'chainId',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'identity',
            type: 'bytes',
            internalType: 'bytes',
          },
        ],
      },
      {
        name: 'asset',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'interestRateModel',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'address',
        internalType: 'contract IInterestRateModel',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'onCall',
    inputs: [
      {
        name: 'context',
        type: 'tuple',
        internalType: 'struct MessageContext',
        components: [
          {
            name: 'sender',
            type: 'bytes',
            internalType: 'bytes',
          },
          {
            name: 'senderEVM',
            type: 'address',
            internalType: 'address',
          },
          {
            name: 'chainID',
            type: 'uint256',
            internalType: 'uint256',
          },
        ],
      },
      {
        name: 'zrc20',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'amount',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'message',
        type: 'bytes',
        internalType: 'bytes',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'onRevert',
    inputs: [
      {
        name: 'revertContext',
        type: 'tuple',
        internalType: 'struct RevertContext',
        components: [
          {
            name: 'sender',
            type: 'address',
            internalType: 'address',
          },
          {
            name: 'asset',
            type: 'address',
            internalType: 'address',
          },
          {
            name: 'amount',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'revertMessage',
            type: 'bytes',
            internalType: 'bytes',
          },
        ],
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'poolManager',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'address',
        internalType: 'contract IPoolManager',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'priceOracle',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'address',
        internalType: 'contract IPriceOracle',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'repay',
    inputs: [
      {
        name: 'asset',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'amount',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'onBehalfOf',
        type: 'tuple',
        internalType: 'struct UniversalIdentityLib.UniversalIdentity',
        components: [
          {
            name: 'chainId',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'identity',
            type: 'bytes',
            internalType: 'bytes',
          },
        ],
      },
    ],
    outputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'supply',
    inputs: [
      {
        name: 'asset',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'amount',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'onBehalfOf',
        type: 'tuple',
        internalType: 'struct UniversalIdentityLib.UniversalIdentity',
        components: [
          {
            name: 'chainId',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'identity',
            type: 'bytes',
            internalType: 'bytes',
          },
        ],
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'swapZRC20',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'address',
        internalType: 'contract ISwap',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'totalScaledDebt',
    inputs: [
      {
        name: '',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'userPrincipalDebt',
    inputs: [
      {
        name: '',
        type: 'bytes32',
        internalType: 'bytes32',
      },
      {
        name: '',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'userScaledShares',
    inputs: [
      {
        name: '',
        type: 'bytes32',
        internalType: 'bytes32',
      },
      {
        name: '',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'withdraw',
    inputs: [
      {
        name: 'asset',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'amount',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'to',
        type: 'tuple',
        internalType: 'struct UniversalIdentityLib.UniversalIdentity',
        components: [
          {
            name: 'chainId',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'identity',
            type: 'bytes',
            internalType: 'bytes',
          },
        ],
      },
    ],
    outputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'withdraw',
    inputs: [
      {
        name: 'receiver',
        type: 'bytes',
        internalType: 'bytes',
      },
      {
        name: 'amount',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'zrc20',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'revertOptions',
        type: 'tuple',
        internalType: 'struct RevertOptions',
        components: [
          {
            name: 'revertAddress',
            type: 'address',
            internalType: 'address',
          },
          {
            name: 'callOnRevert',
            type: 'bool',
            internalType: 'bool',
          },
          {
            name: 'abortAddress',
            type: 'address',
            internalType: 'address',
          },
          {
            name: 'revertMessage',
            type: 'bytes',
            internalType: 'bytes',
          },
          {
            name: 'onRevertGasLimit',
            type: 'uint256',
            internalType: 'uint256',
          },
        ],
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'withdrawAndCall',
    inputs: [
      {
        name: 'receiver',
        type: 'bytes',
        internalType: 'bytes',
      },
      {
        name: 'amount',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'zrc20',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'message',
        type: 'bytes',
        internalType: 'bytes',
      },
      {
        name: 'callOptions',
        type: 'tuple',
        internalType: 'struct CallOptions',
        components: [
          {
            name: 'gasLimit',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'isArbitraryCall',
            type: 'bool',
            internalType: 'bool',
          },
        ],
      },
      {
        name: 'revertOptions',
        type: 'tuple',
        internalType: 'struct RevertOptions',
        components: [
          {
            name: 'revertAddress',
            type: 'address',
            internalType: 'address',
          },
          {
            name: 'callOnRevert',
            type: 'bool',
            internalType: 'bool',
          },
          {
            name: 'abortAddress',
            type: 'address',
            internalType: 'address',
          },
          {
            name: 'revertMessage',
            type: 'bytes',
            internalType: 'bytes',
          },
          {
            name: 'onRevertGasLimit',
            type: 'uint256',
            internalType: 'uint256',
          },
        ],
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    name: 'Borrowed',
    inputs: [
      {
        name: 'asset',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'sender',
        type: 'tuple',
        indexed: true,
        internalType: 'struct UniversalIdentityLib.UniversalIdentity',
        components: [
          {
            name: 'chainId',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'identity',
            type: 'bytes',
            internalType: 'bytes',
          },
        ],
      },
      {
        name: 'onBehalfOf',
        type: 'tuple',
        indexed: true,
        internalType: 'struct UniversalIdentityLib.UniversalIdentity',
        components: [
          {
            name: 'chainId',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'identity',
            type: 'bytes',
            internalType: 'bytes',
          },
        ],
      },
      {
        name: 'amount',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'Repaid',
    inputs: [
      {
        name: 'asset',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'repayer',
        type: 'tuple',
        indexed: true,
        internalType: 'struct UniversalIdentityLib.UniversalIdentity',
        components: [
          {
            name: 'chainId',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'identity',
            type: 'bytes',
            internalType: 'bytes',
          },
        ],
      },
      {
        name: 'onBehalfOf',
        type: 'tuple',
        indexed: true,
        internalType: 'struct UniversalIdentityLib.UniversalIdentity',
        components: [
          {
            name: 'chainId',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'identity',
            type: 'bytes',
            internalType: 'bytes',
          },
        ],
      },
      {
        name: 'amount',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'RevertEvent',
    inputs: [
      {
        name: 'reason',
        type: 'string',
        indexed: false,
        internalType: 'string',
      },
      {
        name: 'context',
        type: 'tuple',
        indexed: false,
        internalType: 'struct RevertContext',
        components: [
          {
            name: 'sender',
            type: 'address',
            internalType: 'address',
          },
          {
            name: 'asset',
            type: 'address',
            internalType: 'address',
          },
          {
            name: 'amount',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'revertMessage',
            type: 'bytes',
            internalType: 'bytes',
          },
        ],
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'Supplied',
    inputs: [
      {
        name: 'asset',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'sender',
        type: 'tuple',
        indexed: true,
        internalType: 'struct UniversalIdentityLib.UniversalIdentity',
        components: [
          {
            name: 'chainId',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'identity',
            type: 'bytes',
            internalType: 'bytes',
          },
        ],
      },
      {
        name: 'onBehalfOf',
        type: 'tuple',
        indexed: true,
        internalType: 'struct UniversalIdentityLib.UniversalIdentity',
        components: [
          {
            name: 'chainId',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'identity',
            type: 'bytes',
            internalType: 'bytes',
          },
        ],
      },
      {
        name: 'amount',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'Withdrawn',
    inputs: [
      {
        name: 'asset',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'sender',
        type: 'tuple',
        indexed: true,
        internalType: 'struct UniversalIdentityLib.UniversalIdentity',
        components: [
          {
            name: 'chainId',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'identity',
            type: 'bytes',
            internalType: 'bytes',
          },
        ],
      },
      {
        name: 'to',
        type: 'tuple',
        indexed: true,
        internalType: 'struct UniversalIdentityLib.UniversalIdentity',
        components: [
          {
            name: 'chainId',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'identity',
            type: 'bytes',
            internalType: 'bytes',
          },
        ],
      },
      {
        name: 'amount',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
    ],
    anonymous: false,
  },
  {
    type: 'error',
    name: 'ReentrancyGuardReentrantCall',
    inputs: [],
  },
  {
    type: 'error',
    name: 'SafeERC20FailedOperation',
    inputs: [
      {
        name: 'token',
        type: 'address',
        internalType: 'address',
      },
    ],
  },
  {
    type: 'error',
    name: 'TransferFailed',
    inputs: [],
  },
  {
    type: 'error',
    name: 'Unauthorized',
    inputs: [],
  },
] as const

export const EVM_GATEWAY_ABI = [
  {
    inputs: [
      { internalType: 'address', name: 'receiver', type: 'address' },
      { internalType: 'bytes', name: 'payload', type: 'bytes' },
      {
        components: [
          { internalType: 'address', name: 'revertAddress', type: 'address' },
          { internalType: 'bool', name: 'callOnRevert', type: 'bool' },
          { internalType: 'address', name: 'abortAddress', type: 'address' },
          { internalType: 'bytes', name: 'revertMessage', type: 'bytes' },
          {
            internalType: 'uint256',
            name: 'onRevertGasLimit',
            type: 'uint256',
          },
        ],
        internalType: 'struct RevertOptions',
        name: 'revertOptions',
        type: 'tuple',
      },
    ],
    name: 'call',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'receiver', type: 'address' },
      { internalType: 'bytes', name: 'payload', type: 'bytes' },
      {
        components: [
          { internalType: 'address', name: 'revertAddress', type: 'address' },
          { internalType: 'bool', name: 'callOnRevert', type: 'bool' },
          { internalType: 'address', name: 'abortAddress', type: 'address' },
          { internalType: 'bytes', name: 'revertMessage', type: 'bytes' },
          {
            internalType: 'uint256',
            name: 'onRevertGasLimit',
            type: 'uint256',
          },
        ],
        internalType: 'struct RevertOptions',
        name: 'revertOptions',
        type: 'tuple',
      },
    ],
    name: 'depositAndCall',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
] as const
