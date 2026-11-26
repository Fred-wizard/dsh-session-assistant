# DSH 会话助手 · DSH Session Assistant

在 DeepSeek Harness 左侧栏添加「置顶会话」「最近会话」和「同步 Codex」，把本机 Codex 的会话导入为可以打开和继续使用的 DSH 会话，并复制 Markdown 记忆。

## 安装

支持 **DeepSeek Harness 0.2.2-rc.5**。在 DSH 左侧打开「插件」→「添加插件」，粘贴：

```text
https://github.com/Fred-wizard/dsh-codex-sidebar/releases/latest/download/dsh-codex-sidebar.tgz
```

安装后启用插件。侧栏没有出现时，重开 DSH。

也可以通过 GitHub 标签安装。此方式需要 DSH 安装器能在本机调用 Git：

```sh
dsh plugin --profile desktop add "github:Fred-wizard/dsh-codex-sidebar#v1.0.1"
```

已有独立的 Codex 会话导入与侧栏插件时，建议先停用旧入口以避免同时显示两个侧栏。已导入会话仍属于原 DSH 工作区。若要沿用旧导入记录以防重复，可将 `outputDir` 指向兼容旧迁移的数据目录。

## 使用

- 启用或重开 DSH 后自动检查可导入的会话和记忆。也可以在「最近会话」下点「同步 Codex」。
- 点击会话标题打开历史，点击图钉切换 DSH 置顶。最近会话按更新时间排列，跳过置顶、已归档和 Codex 附属会话。
- 在 DSH 中可用 `codex_memory_search` 查找已导入的 Markdown 记忆。

同步从 Codex 单向导入新会话和变化的 Markdown 记忆。已有会话的后续消息各自在原应用保留。目录默认使用 `CODEX_HOME`（若有）或本机 `~/.codex`，需要 Codex 的本地会话索引 `state_5.sqlite` 以及对应 `.jsonl` 或 `.jsonl.zst`。导入文件默认存到 DSH 数据目录下的 `codex-sidebar`。插件在本地处理这些文件。

高级配置可在 DSH 的 profile 补丁中覆盖 `dsh-codex-sidebar`：`codexDir` 指定 Codex 数据目录，`outputDir` 指定迁移数据目录，`autoImportOnStart: false` 关闭启动时的自动检查。

## 开发

`npm run build` 生成 DSH 可加载的客户端模块。`npm test` 运行本地测试。Git 安装直接使用已提交的构建结果。

[MIT](LICENSE) · [上游来源](NOTICE.md)
