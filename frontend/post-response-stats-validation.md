# Post-Response Stats 写入实验验证方案

目标：判断“统计写入近似主回复后执行”是否值得保留。

## 1. 观察周期与样本

- 连续观察至少 3 天（建议覆盖 1 个高峰时段）
- 每天抽样不少于 500 次聊天请求

## 2. 必看指标

### A. 前端体感指标

- 前端“最终回复完成时间”（从发送到完整回复结束）
- 对比实验前基线（建议看 P50 / P95）

### B. 服务端统计写日志

- `Stats write took Xms` 分布（P50 / P95 / P99）
- `Slow stats write` 频率（占总请求比例）
- `Stats write failed` 频率（占总请求比例）

### C. 统计数据完整性

- `daily_usage_stats` 是否出现明显偏低（相对聊天请求量）
- `daily_tool_usage` 是否出现明显偏低（相对工具调用量）

## 3. 建议阈值（简化版）

- `Slow stats write` 比例 < 1%
- `Stats write failed` 比例 < 0.1%
- `daily_usage_stats` 与聊天请求量偏差在 ±3% 以内
- `daily_tool_usage` 与工具调用量偏差在 ±5% 以内

## 4. 保留 / 回滚判断

### 保留当前方案（近似主回复后执行）

同时满足以下条件：

- 前端最终回复完成时间有可感知改善（至少 P95 下降）
- `Stats write failed` 稳定低于阈值
- `daily_usage_stats / daily_tool_usage` 无持续性偏低

### 回滚到原同步执行

任一条件满足即可回滚：

- `Stats write failed` 连续超阈值
- `daily_usage_stats` 或 `daily_tool_usage` 出现持续偏低且无法解释
- 前端体感无明显改善（P95 无改善）但统计稳定性变差

## 5. 执行建议

- 每日固定时间复盘一次上述 3 类指标
- 连续 3 天满足“保留条件”再正式保留
- 一旦触发“回滚条件”，优先回滚，再排查运行环境生命周期问题
