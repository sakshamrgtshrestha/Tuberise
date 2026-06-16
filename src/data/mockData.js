// Mock data store for TubeRise (replaces Firebase in Phase 1)
// mockTasks is a mutable array — campaign creation pushes into it at runtime

export const mockUser = {
  id: 'user_001',
  displayName: 'Alex Johnson',
  email: 'alex@gmail.com',
  photoURL: 'https://i.pravatar.cc/150?img=12',
  coinBalance: 1453,
  warningCount: 0,
  isBanned: false,
  createdAt: '2024-01-15T10:00:00Z',
};

export let mockTasks = [
  {
    id: 'task_001',
    campaignId: 'camp_001',
    creatorId: 'user_002',          // created by Maria — visible to everyone else
    status: 'active',
    currentProgress: 80,
    totalRequired: 200,
    type: 'watch',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    videoId: 'dQw4w9WgXcQ',
    coinsReward: 25,
    watchTimeRequired: 87,
    channelName: 'Rick Astley',
    channelAvatar: 'https://i.pravatar.cc/40?img=3',
    videoTitle: 'Rick Astley - Never Gonna Give You Up (Official Music Video)',
    viewCount: '1.5B views',
  },
  {
    id: 'task_002',
    campaignId: 'camp_002',
    creatorId: 'user_004',          // created by Priya
    status: 'active',
    currentProgress: 20,
    totalRequired: 50,
    type: 'subscribe',
    videoUrl: 'https://www.youtube.com/watch?v=9bZkp7q19f0',
    videoId: '9bZkp7q19f0',
    coinsReward: 40,
    watchTimeRequired: 60,
    channelName: 'PSY Official',
    channelAvatar: 'https://i.pravatar.cc/40?img=5',
    videoTitle: 'PSY - GANGNAM STYLE(강남스타일) M/V',
    viewCount: '5.2B views',
  },
  {
    id: 'task_003',
    campaignId: 'camp_003',
    creatorId: 'user_005',          // created by Tom
    status: 'active',
    currentProgress: 10,
    totalRequired: 100,
    type: 'like',
    videoUrl: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk',
    videoId: 'kJQP7kiw5Fk',
    coinsReward: 15,
    watchTimeRequired: 45,
    channelName: 'Luis Fonsi',
    channelAvatar: 'https://i.pravatar.cc/40?img=7',
    videoTitle: 'Luis Fonsi - Despacito ft. Daddy Yankee',
    viewCount: '8.3B views',
  },
  {
    id: 'task_004',
    campaignId: 'camp_004',
    creatorId: 'user_002',          // created by Maria
    status: 'active',
    currentProgress: 5,
    totalRequired: 30,
    type: 'comment',
    videoUrl: 'https://www.youtube.com/watch?v=JGwWNGJdvx8',
    videoId: 'JGwWNGJdvx8',
    coinsReward: 20,
    watchTimeRequired: 60,
    channelName: 'Ed Sheeran',
    channelAvatar: 'https://i.pravatar.cc/40?img=8',
    videoTitle: 'Ed Sheeran - Shape of You (Official Music Video)',
    viewCount: '6.1B views',
  },
];

// ── Shared task-store helpers ─────────────────────────────────────────────────

/**
 * Push a newly-created campaign task into the shared store.
 * Called from CampaignCreationScreen when the user taps "Create Campaign".
 */
export function addTaskToStore(task) {
  mockTasks = [task, ...mockTasks];
}

/**
 * Return tasks of a given type that are visible to `userId`.
 * Rules (all must pass):
 *   1. type matches
 *   2. creator is NOT the current user  — own campaigns never appear as tasks
 *   3. task status is 'active'
 *   4. campaign still needs more completions (currentProgress < totalRequired)
 */
export function getTasksForUser(type, userId) {
  return mockTasks.filter(
    (t) =>
      t.type === type &&
      t.creatorId !== userId &&
      t.status === 'active' &&
      t.currentProgress < t.totalRequired
  );
}

/**
 * Return ALL tasks/campaigns created BY `userId` (the campaign tab).
 * Sorted newest first.
 */
export function getCampaignsForUser(userId) {
  return mockTasks
    .filter((t) => t.creatorId === userId)
    .sort((a, b) => (b.createdAt ?? '') > (a.createdAt ?? '') ? 1 : -1);
}

/**
 * Increment currentProgress on the task that matches `campaignId`.
 * Sets status to 'completed' when currentProgress >= totalRequired.
 * Called from YouTubeWebView every time a user finishes a task.
 */
export function updateCampaignProgress(campaignId) {
  mockTasks = mockTasks.map((t) => {
    if (t.campaignId !== campaignId) return t;
    const next = (t.currentProgress ?? 0) + 1;
    return {
      ...t,
      currentProgress: next,
      status: next >= (t.totalRequired ?? 1) ? 'completed' : t.status,
    };
  });
}

export const mockTaskCounts = {
  watch: 24,
  subscribe: 11,
  like: 38,
  comment: 17,
};

export const mockCoinsPerTask = {
  watch: 25,
  subscribe: 40,
  like: 15,
  comment: 20,
};

export const mockCampaigns = [
  {
    id: 'camp_my_001',
    creatorId: 'user_001',
    videoUrl: 'https://www.youtube.com/watch?v=abc123',
    videoId: 'abc123',
    channelName: 'My Channel',
    channelAvatar: 'https://i.pravatar.cc/50?img=12',
    type: ['watch', 'subscribe'],
    taskTypes: ['watch', 'subscribe'],
    budget: 12600,
    targets: { views: 200, subscribers: 50 },
    watchTimeRequired: 60,
    status: 'active',
    progress: { views: 133, subscribers: 28 },
    createdAt: '2024-03-01T08:00:00Z',
    participants: [
      { id: 'u1', name: 'Maria G.', avatar: 'https://i.pravatar.cc/36?img=1', timeAgo: '2 min ago' },
      { id: 'u2', name: 'James K.', avatar: 'https://i.pravatar.cc/36?img=2', timeAgo: '15 min ago' },
      { id: 'u3', name: 'Priya S.', avatar: 'https://i.pravatar.cc/36?img=9', timeAgo: '1 hr ago' },
      { id: 'u4', name: 'Tom W.', avatar: 'https://i.pravatar.cc/36?img=11', timeAgo: '3 hrs ago' },
    ],
  },
  {
    id: 'camp_my_002',
    creatorId: 'user_004',
    videoUrl: 'https://www.youtube.com/watch?v=xyz456',
    videoId: 'xyz456',
    channelName: 'Priya Music',
    channelAvatar: 'https://i.pravatar.cc/50?img=9',
    type: ['like', 'comment'],
    taskTypes: ['like', 'comment'],
    budget: 5250,
    targets: { views: 150, subscribers: 0 },
    watchTimeRequired: 30,
    status: 'active',
    progress: { views: 44, subscribers: 0 },
    createdAt: '2024-04-10T12:00:00Z',
    participants: [
      { id: 'u1', name: 'Alex J.', avatar: 'https://i.pravatar.cc/36?img=12', timeAgo: '5 min ago' },
    ],
  },
];

export const mockUsers = [
  { id: 'user_001', displayName: 'Alex Johnson', email: 'alex@gmail.com', avatar: 'https://i.pravatar.cc/40?img=12', coinBalance: 1453, warningCount: 0, isBanned: false },
  { id: 'user_002', displayName: 'Maria Garcia', email: 'maria@gmail.com', avatar: 'https://i.pravatar.cc/40?img=1', coinBalance: 820, warningCount: 1, isBanned: false },
  { id: 'user_003', displayName: 'James Kim', email: 'james@gmail.com', avatar: 'https://i.pravatar.cc/40?img=2', coinBalance: 0, warningCount: 2, isBanned: true },
  { id: 'user_004', displayName: 'Priya Sharma', email: 'priya@gmail.com', avatar: 'https://i.pravatar.cc/40?img=9', coinBalance: 2100, warningCount: 0, isBanned: false },
  { id: 'user_005', displayName: 'Tom Wilson', email: 'tom@gmail.com', avatar: 'https://i.pravatar.cc/40?img=11', coinBalance: 340, warningCount: 1, isBanned: false },
];
