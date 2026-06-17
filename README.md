# Git Lifeline

将 Git 提交历史可视化为动态「生命线」——以树形结构展示文件随时间的新增、修改与删除，配合粒子动效与时间轴回放，直观感受项目的演化过程。

在线体验：[GitHub Pages](https://ikaros-521.github.io/git_lifeline/)

## 功能特性

- **多种数据源**
  - 内置示例数据，快速预览效果
  - 粘贴 `git log` 输出或上传日志文件
  - 直接输入 GitHub 仓库地址拉取提交记录
- **动态可视化**
  - 基于 D3 的文件树动画，按提交逐步生长
  - 文件增删改触发粒子爆发效果
  - 时间轴控制：播放、暂停、拖拽跳转
- **路径筛选**
  - 支持白名单 / 黑名单模式
  - 可按目录、通配符（如 `src/`、`*.vue`）过滤关注的文件
- **主题切换**
  - 赛博森林、晨曦花园、星夜三种视觉主题
- **视频导出**
  - 快速导出 WebM，或逐帧高质量导出

## 技术栈

- [Vue 3](https://vuejs.org/) + TypeScript
- [Vite](https://vitejs.dev/)
- [D3.js](https://d3js.org/)
- [CCapture.js](https://github.com/spite/ccapture.js/)（视频录制）

## 快速开始

### 环境要求

- Node.js 18+
- npm

### 安装与运行

```bash
git clone https://github.com/Ikaros-521/git_lifeline.git
cd git_lifeline
npm install
npm run dev
```

开发服务器默认在 [http://localhost:3000](http://localhost:3000) 启动。

### 构建

```bash
npm run build
npm run preview
```

## 使用说明

### 从本地仓库导入

在项目根目录执行以下命令，将输出粘贴到应用的「粘贴日志」面板：

**PowerShell**

```powershell
git log --since="30 days ago" --pretty=format:"commit %H%nAuthor: %an <%ae>%nDate:   %ad%nBranches: %d%n%n  %s%n%n%b" --date=iso --name-status
```

**Bash / Git Bash**

```bash
git log --since="30 days ago" --pretty=format:"commit %H%nAuthor: %an <%ae>%nDate:   %ad%nBranches: %d%n%n  %s%n%n%b" --date=iso --name-status
```

也可直接上传 `.log` 或 `.txt` 日志文件。应用内会按你的系统提供对应命令提示。

### 从 GitHub 导入

输入仓库地址，例如 `https://github.com/vuejs/core`，选择时间范围后即可拉取公开仓库的提交历史。

> 本地开发时通过 Vite 代理访问 GitHub API，避免浏览器跨域限制。生产环境直接请求 `api.github.com`，受 GitHub API 速率限制影响。

## 项目结构

```
src/
├── components/       # UI 组件（数据源面板、时间轴、导出对话框等）
├── composables/      # 状态与动画引擎
├── data/
│   └── adapters/     # Git 日志解析、GitHub API 适配
├── engine/           # 树形渲染器、粒子系统
├── assets/themes/    # 主题样式
└── utils/            # 颜色、路径筛选、视频导出
```

## 部署

项目通过 GitHub Actions 自动构建并部署到 GitHub Pages。推送至 `master` 或 `main` 分支即可触发部署。

## 许可证

本项目采用 [MIT License](LICENSE) 开源。
