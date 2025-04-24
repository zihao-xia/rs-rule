export const nameList = ['氪豹', '林冲'];

// 日志计时相关的工具函数

// 存储每个群组的日志计时信息
export interface LogTimerInfo {
  startTime: number; // 开始时间
  totalTime: number; // 累计时间（毫秒）
  isRunning: boolean; // 是否正在计时
  lastStartTime: number; // 上次开始计时的时间（用于暂停后继续）
}

// 群组ID -> 日志名称 -> 计时信息
export const logTimers: Map<string, Map<string, LogTimerInfo>> = new Map();

// 开始计时
export function startTimer(groupId: string, logName: string): void {
  const now = Date.now();

  // 获取群组的所有日志计时器
  let groupTimers = logTimers.get(groupId);
  if (!groupTimers) {
    groupTimers = new Map();
    logTimers.set(groupId, groupTimers);
  }

  // 获取或创建指定日志的计时器
  let timerInfo = groupTimers.get(logName);
  if (!timerInfo) {
    timerInfo = {
      startTime: now,
      totalTime: 0,
      isRunning: true,
      lastStartTime: now,
    };
    groupTimers.set(logName, timerInfo);
  } else if (!timerInfo.isRunning) {
    // 如果计时器已存在但没有运行，则继续计时
    timerInfo.isRunning = true;
    timerInfo.lastStartTime = now;
  }
}

// 暂停计时
export function pauseTimer(groupId: string, logName: string): void {
  const now = Date.now();

  // 获取群组的所有日志计时器
  const groupTimers = logTimers.get(groupId);
  if (!groupTimers) return;

  // 获取指定日志的计时器
  const timerInfo = groupTimers.get(logName);
  if (!timerInfo || !timerInfo.isRunning) return;

  // 更新累计时间并暂停
  timerInfo.totalTime += now - timerInfo.lastStartTime;
  timerInfo.isRunning = false;
}

// 结束计时
export function endTimer(groupId: string, logName: string): number {
  const now = Date.now();

  // 获取群组的所有日志计时器
  const groupTimers = logTimers.get(groupId);
  if (!groupTimers) return 0;

  // 获取指定日志的计时器
  const timerInfo = groupTimers.get(logName);
  if (!timerInfo) return 0;

  // 如果计时器仍在运行，更新累计时间
  if (timerInfo.isRunning) {
    timerInfo.totalTime += now - timerInfo.lastStartTime;
    timerInfo.isRunning = false;
  }

  return timerInfo.totalTime;
}

// 获取计时结果
export function getTimerResult(
  groupId: string,
  logName: string
): { totalTime: number; isRunning: boolean } {
  const now = Date.now();

  // 获取群组的所有日志计时器
  const groupTimers = logTimers.get(groupId);
  if (!groupTimers) return { totalTime: 0, isRunning: false };

  // 获取指定日志的计时器
  const timerInfo = groupTimers.get(logName);
  if (!timerInfo) return { totalTime: 0, isRunning: false };

  // 计算总时间
  let totalTime = timerInfo.totalTime;
  if (timerInfo.isRunning) {
    totalTime += now - timerInfo.lastStartTime;
  }

  return { totalTime, isRunning: timerInfo.isRunning };
}

// 格式化时间（毫秒转为可读格式）
export function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  const remainingMinutes = minutes % 60;
  const remainingSeconds = seconds % 60;

  let result = '';
  if (hours > 0) {
    result += `${hours}小时`;
  }
  if (remainingMinutes > 0 || hours > 0) {
    result += `${remainingMinutes}分钟`;
  }
  result += `${remainingSeconds}秒`;

  return result;
}
