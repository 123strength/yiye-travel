# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 语言偏好
- 始终使用中文回复用户

## 项目概述
这是"中国5A级景区·旅行星图"——一个单文件前端应用（`网站加强4.html`，约3900行，4.1MB），无需构建工具，直接在浏览器中打开即可运行。

## 如何开发
- 没有构建步骤、包管理器或测试套件
- 直接用浏览器打开 `网站加强4.html` 即可预览
- 所有数据存储在浏览器的 `localStorage` 中
- 依赖通过 CDN 加载：Font Awesome（CSS）和 Three.js（ES import map）

## 架构

### 视图导航
应用使用基于 div 显示/隐藏的视图系统，由 `switchView(viewName)` 函数控制。主要视图包括：
- `starMap` — 3D 星图（初始视图）
- `explore` — 分类景点探索 + 省份/城市手风琴浏览器
- `links` — 出行服务链接页
- `qa` — 问答社区
- `share` — 旅行分享
- `cityDetail` / `attractionDetail` — 城市和景点详情子页面

### 数据结构
核心数据是 `scenicData` 全局对象，其层级结构如下：
```
scenicData = {
  '省份名': {
    '城市名': {
      desc: '城市介绍',
      coord: [经度, 纬度],
      attractions: [
        { name, description, link, coord, type }
      ]
    }
  }
}
```
用户可以通过 UI 添加数据，运行时合并到 `scenicData`（原始来源及用户数据均保存在 localStorage 的 `china5A_userData` 中）。

### 数据持久化
所有数据使用 `localStorage`，键名前缀为 `china5A_`：
- `china5A_reviews_v2` — 景点/城市评分和评价
- `china5A_shares` — 用户旅行分享
- `china5A_qa` — 问答帖子
- `china5A_itineraries` / `china5A_cityTrips` — 旅行行程
- `china5A_journals` / `china5A_travelNotes` — 游记笔记
- `china5A_cityImages` / `china5A_cityCarousel` — 城市和景点的图片
- `china5A_attrGuides` / `china5A_attrReviews` — 景点攻略和评价
- `china5A_userData` — 用户自定义城市/景点数据
- `china5A_manualCats` — 景点分类的手动覆盖
- `china5A_exploreBg` — 探索页面的背景图片

### 3D 星图（Three.js）
- 延迟加载：Three.js 模块在用户首次切换到星图视图时才通过 `import()` 动态加载
- 由 `_buildStarMap()` 构建，使用 `OrbitControls` 和 `CSS2DRenderer` 渲染标签
- 城市在 3D 空间中按地理相邻性分组为 11 个区域中心
- 通过射线检测实现交互，悬停显示提示框，点击打开城市详情
- 搜索功能通过 `highlightStarNode()` 实现，高亮匹配的节点并隐藏不匹配的节点

### 景点分类系统
智能分类引擎 `classifyAttraction()` 根据名称和描述中的关键词将景点自动分类到 7 个类别（山岳、瀑布、峡谷、湖泊、草原、寺庙、历史）。用户可以通过 UI 手动覆盖分类，覆盖结果保存在 `china5A_manualCats` 中。

### AI 聊天机器人
使用可配置的 API 端点（默认 OpenAI 兼容格式）。设置保存在 localStorage 的 `china5A_apiConfig` 中。通过浮动按钮切换显示，支持快速回复和流式对话。

### 代码风格
- 所有 JavaScript 均内联在单个 `<script>` 标签中
- 使用 `var` 声明变量，采用全局函数而非模块
- HTML 内联了大量事件处理属性（`onclick="..."`）
- 转义使用 `esc()` 辅助函数处理嵌入在 HTML 属性中的引号

## Supabase 全栈升级（已实现）

网站已集成 Supabase 用户认证系统，支持注册/登录和个人账号。

### 关键原则
- **Supabase SDK 必须按需动态加载**：通过 `ensureSupabase()` 函数在用户点击登录时才创建 `<script>` 标签加载 SDK。绝不能在 `<head>` 中同步加载 Supabase CDN 脚本——jsDelivr CDN 在国内访问极慢，会阻塞整页渲染，导致星图和探索模式无法使用
- **所有 `supabase.xxx` 调用必须有 null 检查**：因为 SDK 可能在加载中或加载失败
- **未登录完全兼容 localStorage**：Supabase 是可选增强，未配置或未登录时网站所有原有功能正常工作

### 核心变量
- `SUPABASE_URL` / `SUPABASE_ANON_KEY` — Supabase 项目配置（当前为占位符）
- `var supabase = null` — Supabase 客户端实例，SDK 未加载时为 null
- `var currentUser` — 当前登录用户对象
- `var userProfile` — 用户资料（从 profiles 表读取）

### 核心函数
- `ensureSupabase()` — 按需动态加载 SDK，返回 Promise<client|null>
- `initAuth()` — 页面加载时自动恢复登录状态（在 DOMContentLoaded 中调用）
- `updateAuthUI()` — 根据登录状态更新 header 中的登录按钮/用户菜单
- `handleLogin()` / `handleRegister()` / `handleLogout()` — 认证操作
- `showToast(msg, type)` — 弹出消息提示
- `uploadImageToSupabase(file)` — 上传图片到 Supabase Storage
- `syncLocalToCloud()` — 将 localStorage 数据同步到云端

### 新增视图
- `profile` — 用户个人主页（查看/编辑资料、内容统计）

### 数据关联
所有保存操作在登录后自动关联 `user_id` + `author`（从用户资料获取），涉及函数：
`saveShare`、`saveReview`、`saveQaQuestion`、`saveAnswer`、`saveNote`、
`saveTrip`、`saveAttrGuide`、`saveAttrReview`、`saveAddData`、`saveAddAttraction`

### 数据库表（需在 Supabase 控制台创建）
profiles, reviews, shares, qa_posts, travel_notes, itineraries, attr_guides, user_attractions

### Storage 配置
需创建 `images` bucket（公开可读），用于存储用户上传的图片。
