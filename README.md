# proof-of-understanding（理解证明）
“我该怎么做呢？”小王子问。“你要非常有耐心。”狐狸说，“首先，你要坐得离我稍远一点，就像这样，坐在草地上。我会偷偷地看你，你不要说话。语言是误解的源头。但是，你每天都可以坐得离我更近一点......”

## 简介
在2025年3月份的“Rock Web5 南塘CodeCamp”中，在AI的帮助下我尝试写了这个应用。这是一个基于 CKB (Nervos Network) 区块链和 Nostr 协议的对话应用小样。

我的假设是人是复杂的，也是充满想象力的，完全理解彼此是不可能的，但我们可以在某些具体的情境中，采用提问和复述两种常见的对话技术，去避免因一时失控而伤害我们在意的人，或者做出可能产生糟糕后果的正式决策。

## 细节
我想象了两种情境：
1. 在日常的线上对话中，有时会开始失控，我们会忽视对方的表达，很急切地想要说出自己的想法。这种情境往往会让对话越来越紧张、封闭、和具有防御性。但我们并不想伤害彼此，过后也许会后悔。
2. 在DAO中对提案进行投票，日常生活中签订契约等情境下，我们对参与者的假设是ta是完全理性的、对自己的决定负责。但实际上并不是：参与者也许对提案有疑问，或者因为提案太过冗长而没有阅读完。但ta仍然会投票或者在合约上签名。

提问和复述是两种普通的对话技巧，前者最出名的例子是“苏格拉底提问”（尽管它与普通的提问也相区分）；后者有费曼的名言：“如果我们无法把一个理论简化为大学一年级的学生能理解的程度，我们就不理解这个理论”。

从这个情境以及这两个对话技术出发，我想做一个基于Nostr的对话应用。这个应用有自由对话和理解证明两种模式，前者是自然对话，后者基于这两个直接但很难做到的常识——提问和复述——来为我们的对话加上一些限制和形式，以帮助我们度过那些难以保持理性但是又需要理性的时刻。

双方基于Nostr地址来进行对话，如果在理解证明模式中达成了理解，那么双方可以选择做一个DOB，将这段对话上链（在小样中没有实现）。

在艰难的对话情境中，这段对话是双方付出了一些努力而产生的，因此DOB的铸造是有价值的。

在需要人保持理性的情境中，如对DAO的提案投票，拥有这个DOB可以作为投票的门槛。


## 技术栈
- **前端框架**：React 18
- **开发语言**：TypeScript
- **UI 组件库**：Ant Design
- **区块链相关**：
  - @ckb-ccc/ccc
  - @ckb-ccc/connector
  - @ckb-ccc/connector-react
  - @ckb-ccc/shell
- **社交协议**：
  - nostr-tools
- **其他技术**：
  - Tailwind CSS 用于样式管理
  - React Router 用于路由管理
  - Craco 用于项目配置覆盖