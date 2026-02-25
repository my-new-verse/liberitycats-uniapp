# 业务逻辑

## 产品定位

**Liberty Cats** 是一款面向加密/NFT 用户的移动端综合平台，核心功能包括：
- NFT 质押（持有 LibertyCats NFT 可质押获取积分）
- 加密钱包集成（OKX Wallet）
- 电商商城（实物商品购买）
- 社区互动（帖子、评论、点赞）
- 加密行情与新闻资讯
- 休闲小游戏

App 名称：Liberty Cats | 版本：1.0.197 | 原始工程名：EasyUniapp2

---

## Tabbar 五大入口

### 1. 首页（`pages/tabbar/home.vue`）
- 轮播 Banner（广告位）
- "New Arrivals" 新品推荐
- NFT 交易入口
- 系统公告/活动公告展示
- 顶部右侧未读通知铃铛（红点徽章）

### 2. 商城（`pages/tabbar/mall.vue`）
- 按分类浏览商品
- 商品搜索
- 排序筛选（价格 / 人气 / 最新）
- 购物车管理

### 3. 游戏（`pages/tabbar/game.vue`）
- **Matchin' CAT**（消消乐风格）
- **Jumpin' CAT**（跳一跳风格）
- 进入游戏前通过 `/v1/open-api/game/get-new-token` 获取游戏 token 验证身份

### 4. 发现（`pages/tabbar/discover.vue`）
四个子 Tab，下拉刷新 + 无限滚动：
- **News** — 加密/财经新闻（来自外部新闻 API）
- **Quotes** — 加密货币行情（以 USDT 计价）
- **Fiat** — 法币汇率换算器
- **Social** — 社区帖子流

### 5. 我的（`pages/tabbar/my.vue`）
- 用户头像（可点击编辑）与昵称
- 用户等级徽章
- AR 游戏绑定状态指示
- 每日签到（显示连续签到天数）
- LibertyCats NFT 收藏展示（每日可刷新一次）
- 资产汇总
- 菜单快捷入口：我的订单 / 我的收藏 / 设置 / 关于我们

---

## 核心业务流程

### 登录流程
```
输入邮箱 → 发送验证码 (sendEmailApi)
      ↓
输入验证码 → 登录 (loginApi) → 返回 token
      ↓
store 存储 token → getUserInfo() 拉取用户信息
      ↓
跳转至登录前目标页 或 /pages/tabbar/my
```

支持的登录方式：
- **邮箱验证码**（主流程）
- **虚拟邮箱**（同一钱包多账号场景）
- **Discord OAuth**（code 换 token）
- **Apple Sign-in**（iOS）

### 电商购物流程
```
浏览商城分类 → 查看商品详情
      ↓
加入购物车 (addToCartApi) 或直接购买
      ↓
选择收货地址 → 创建订单 (createOrderApi)
      ↓
选择支付方式：Stripe / OKX Wallet / Apple IAP
      ↓
支付回调 → 查看订单状态 (getOrderDetailApi)
```

### NFT 质押流程
```
我的页面 → 查看 NFT 列表 (getMemberNftsApi, isPledge=false)
      ↓
选择 NFT → 开始质押 (createPledgeApi(token_id))
      ↓
质押中：监控积分收益 (getPledgeAssetApi)
      ↓
赎回：(redeemNftApi(token_id)) → 积分到账
      ↓
查看排行榜 (getPledgeRankingApi)
```

### 社区互动流程
```
发现 Tab → Social → 浏览帖子列表
      ↓
查看帖子详情 → 点赞 / 评论
      ↓
发布帖子（文字 + 图片）
      ↓
内容管理：删除自己帖子 / 举报 / 拉黑用户
```

---

## 功能模块详情

### 认证（`src/pages/cats/login/`）
- 邮箱输入 → 发送验证码 → 填码登录
- Discord 登录通过 OAuth 回调页 (`pages/callback`) 中转
- Apple 登录仅在 iOS App 端可用
- 虚拟邮箱：同一钱包地址可注册多个账号，邮箱由系统生成

### 电商（`src/pages/cats/goods/`, `order/`, `pay/`）
- 商品详情含 SKU 选择
- 订单支持物流跟踪
- 收藏（Wishlist）：`src/pages/cats/favorite/`
- 收货地址 CRUD：`src/pages/cats/address/`
- 支付方式：
  - **Stripe**（信用卡，走 `/v1/stripe/`）
  - **OKX Wallet**（深度链接唤起 App，走 `/v1/mall/pay/`）
  - **Apple IAP**（App Store 内购，走 `/v1/iap/`）

### NFT 质押（`src/pages/cats/pledge/`）
- NFT 数据来源：OKX 钱包链上数据，可手动刷新（`refreshNftApi`）
- 质押状态：质押中显示预计收益天数
- 资产日志：`src/pages/cats/asset/`

### Web3 钱包（`src/service/api/web3.ts`）
- 连接 OKX 钱包（App 深度链接：`okx://...`）
- 创建链上数据：`createWeb3DataForKeyApi`
- 断开钱包：`disconnectWalletApi`
- 钱包地址在"我的"页面展示（脱敏显示：`formatWalletAddress`）

### 社区（`src/pages/cats/social/`）
- 帖子支持纯文字或图文混排
- 自定义 emoji 表情包（按分类加载：`getEmotionListByCategoryApi`）
- 社区标签筛选
- 内容审核：举报帖子、拉黑用户

### 资讯与行情（`src/pages/cats/news/`, `src/components/discover/`）
- 新闻通过 `httpOut.ts` 请求外部 API（不携带内部 token）
- 行情展示加密货币 USDT 价格
- 法币换算支持多种货币单位（受用户设置中的货币偏好影响）

### 签到系统（`src/service/api/checkin.ts`）
- 每日签到接口：`/v1/checkin/checkin/checkin`
- 签到日历：`/v1/checkin/checkin/list`
- "我的"页面展示连续签到天数

### 通知（`src/pages/cats/notification/`）
- 顶部铃铛红点：`getNotificationUnreadCountApi`
- 通知列表分页：`getNotificationListApi`
- 通知详情弹窗
- 读取后更新未读数

### 用户设置（`src/pages/cats/settings/`）
- 头像：从系统预设头像中选择（`getDefaultAvatarApi`）
- 昵称编辑
- 语言：英文 / 简中 / 繁中
- 货币单位偏好
- 账号管理：退出登录 / 注销账号

### 公告与协议（`src/pages/cats/bulletins/`, `agreement`）
- 系统公告列表与详情
- 用户协议与隐私政策（Webview 或富文本渲染）

### 客服与反馈（`src/pages/cats/kf/`, `faq/`）
- 问题反馈表单：`feedbackApi`
- FAQ 分类与搜索

---

## API 模块一览

| 文件 | 主要接口 |
|------|----------|
| `login.ts` | 邮箱登录、虚拟邮箱、Discord、Apple、登出、注销 |
| `user.ts` | 用户信息、头像、通知、资产、系统配置、AR 绑定 |
| `game.ts` | 游戏 token 获取 |
| `mall.ts` | 商城分类 |
| `goods.ts` | 商品详情与列表 |
| `cart.ts` | 购物车增删改查 |
| `order.ts` | 创建/列表/详情订单 |
| `pay.ts` | 支付发起与状态查询 |
| `stripe.ts` | Stripe 支付集成 |
| `iap.ts` | Apple 内购 |
| `pledge.ts` | NFT 质押、赎回、排行榜 |
| `web3.ts` | 钱包连接与断开 |
| `community.ts` | 帖子、评论、点赞、举报、拉黑 |
| `news.ts` | 新闻列表与详情 |
| `checkin.ts` | 每日签到与日历 |
| `address.ts` | 收货地址 CRUD |
| `announcement.ts` | 系统公告 |
| `asset.ts` | 资产操作记录 |
| `upload.ts` | 文件上传 |
| `fiat.ts` | 法币汇率 |
| `quotes.ts` | 加密货币行情 |
| `feedback.ts` | 用户反馈 |
| `agreement.ts` | 用户协议与隐私政策 |
| `virtualEmail.ts` | 虚拟邮箱管理 |
| `discord.ts` | Discord 集成 |
| `ad.ts` | 广告位管理 |

---

## 多语言内容分类

`src/locale/en.json` 共约 351 个 key，分组如下：

| 前缀 | 内容 |
|------|------|
| `common.*` | 通用按钮、提示、分页 |
| `tabbar.*` | 底部导航栏标签 |
| `home.*` | 首页问候语、区块标题 |
| `my.*` | 签到、积分、等级、NFT |
| `login.*` | 登录入口文案 |
| `login_code.*` | 验证码页面文案 |
| `goods.*`, `mall.*`, `cart.*` | 商品与购物车 |
| `order.*`, `my_order.*`, `pay.*` | 订单与支付 |
| `social.*`, `publish.*` | 社区发帖与互动 |
| `pledge.*` | NFT 质押与积分 |
| `news.*`, `discover.*` | 资讯与发现页 |
| `setting.*` | 用户设置 |
| `address.*` | 收货地址 |
| `kf.*`, `feedback.*` | 客服与反馈 |
| `bulletins.*` | 公告 |
| `time.*` | 相对时间（"刚刚"、"5 分钟前"） |
| `permission.*` | iOS 系统权限说明 |

---

## App 原生配置（`manifest.config.ts`）

- **iOS 深度链接：** `applinks:link.libertycats.app`（用于 OAuth 回调）
- **Android 权限：** 相机、定位、网络、存储、IDFA
- **支付 SDK：** Stripe（含 `returnURL`）、Apple IAP
- **第三方登录：** Apple Sign-in
- **图标：** 72px～1024px 多档
- **启动屏：** iOS 自定义 Storyboard
- **本地化权限说明：** en / zh-Hans / zh-Hant
