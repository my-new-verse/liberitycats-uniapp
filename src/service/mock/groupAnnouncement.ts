export type GroupAnnouncementStatus = 'active' | 'expired'

export interface GroupAnnouncementItem {
  id: number
  room_id: number
  title: string
  summary: string
  content: string
  cover: string
  publisher: string
  publish_time: string
  publish_time_text: string
  expire_time: string
  expire_time_text: string
  scope: string
  status: GroupAnnouncementStatus
  is_pinned: 0 | 1
}

const mockGroupAnnouncements: GroupAnnouncementItem[] = [
  {
    id: 1001,
    room_id: 1,
    title: '潮玩上新：LABUBU 项目系列盲盒来啦！',
    summary: '夏日限定系列来袭，海浪配色 + 懒懒软萌风上线！',
    content:
      '夏日限定系列来袭，海浪配色 + 懒懒软萌风上线！本次上新包含三款主题形象，适合收藏、互换和群内晒单。活动期间群内成员可优先查看购买入口，数量有限，先到先得。\n\n请大家理性参与，避免重复刷屏。如需交流开盒结果，可以在群聊内统一使用晒单话题。',
    cover:
      'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?auto=format&fit=crop&w=480&q=80',
    publisher: 'Admin',
    publish_time: '2026-05-15 20:00',
    publish_time_text: '5月15日 20:00',
    expire_time: '2026-05-21 20:00',
    expire_time_text: '5月21日 20:00',
    scope: '全群成员，限购 2 个/人',
    status: 'active',
    is_pinned: 1,
  },
  {
    id: 1002,
    room_id: 1,
    title: '书籍上新：新书推荐，限时折扣中',
    summary: '精选治愈系读物与收藏画册，本周群友专享折扣。',
    content:
      '本周书籍专区上新，包含治愈系绘本、收藏画册和生活方式读物。群友可享受限时折扣，部分书籍附赠主题书签。\n\n推荐大家按需购买，也欢迎在群内分享读书笔记。',
    cover:
      'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=480&q=80',
    publisher: 'Admin',
    publish_time: '2026-05-12 11:20',
    publish_time_text: '昨天 11:20',
    expire_time: '2026-05-18 23:59',
    expire_time_text: '5月18日 23:59',
    scope: '群友专享，库存售完即止',
    status: 'active',
    is_pinned: 0,
  },
  {
    id: 1003,
    room_id: 1,
    title: '资金配比计划更新：组合调整通知',
    summary: '组合配置比例完成调整，请关注最新说明。',
    content:
      '根据近期市场波动和群内投票反馈，组合配置比例已完成一次调整。请以本公告中的内容为准，旧版说明不再适用。\n\n如对配置逻辑有疑问，可以在群内联系管理员。',
    cover:
      'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=480&q=80',
    publisher: 'Admin',
    publish_time: '2026-05-10 14:45',
    publish_time_text: '上周五 14:45',
    expire_time: '2026-05-25 23:59',
    expire_time_text: '5月25日 23:59',
    scope: '参与计划成员可见',
    status: 'active',
    is_pinned: 0,
  },
  {
    id: 1004,
    room_id: 1,
    title: '群规更新：发言与晒单规范',
    summary: '请全体成员阅读最新群规，共同维护良好交流环境。',
    content: '为提升群内交流质量，现对晒单、广告及引战类内容作出补充说明，违规内容将按群规处理。',
    cover:
      'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=480&q=80',
    publisher: 'Admin',
    publish_time: '2026-05-08 09:30',
    publish_time_text: '5月8日 09:30',
    expire_time: '2026-06-08 23:59',
    expire_time_text: '6月8日 23:59',
    scope: '全群成员',
    status: 'active',
    is_pinned: 0,
  },
  {
    id: 1005,
    room_id: 1,
    title: '线下聚会报名开启',
    summary: '本周六线下交流会开放报名，名额有限。',
    content: '聚会地点与时间详见正文，报名截止至周五 18:00，欢迎群友参与。',
    cover:
      'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=480&q=80',
    publisher: 'Admin',
    publish_time: '2026-05-06 16:00',
    publish_time_text: '5月6日 16:00',
    expire_time: '2026-05-16 18:00',
    expire_time_text: '5月16日 18:00',
    scope: '报名成员',
    status: 'active',
    is_pinned: 0,
  },
  {
    id: 1006,
    room_id: 1,
    title: '系统维护通知',
    summary: '5月5日凌晨将进行系统维护，部分功能暂不可用。',
    content: '维护期间消息同步可能延迟，维护完成后将自动恢复，感谢理解。',
    cover:
      'https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=480&q=80',
    publisher: 'Admin',
    publish_time: '2026-05-04 22:00',
    publish_time_text: '5月4日 22:00',
    expire_time: '2026-05-05 06:00',
    expire_time_text: '5月5日 06:00',
    scope: '全群成员',
    status: 'expired',
    is_pinned: 0,
  },
  {
    id: 1007,
    room_id: 1,
    title: '新人入群必读',
    summary: '欢迎新成员，请先阅读群介绍与常见问题。',
    content: '入群后请先完善资料，了解群内话题分区与管理员联系方式。',
    cover:
      'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=480&q=80',
    publisher: 'Admin',
    publish_time: '2026-05-02 10:00',
    publish_time_text: '5月2日 10:00',
    expire_time: '2026-12-31 23:59',
    expire_time_text: '12月31日 23:59',
    scope: '新成员',
    status: 'active',
    is_pinned: 0,
  },
  {
    id: 1008,
    room_id: 1,
    title: '积分商城兑换说明',
    summary: '群积分可兑换限定周边，兑换规则已更新。',
    content: '积分获取方式与兑换入口见正文，兑换成功后将在群内公示发货批次。',
    cover:
      'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=480&q=80',
    publisher: 'Admin',
    publish_time: '2026-04-28 14:20',
    publish_time_text: '4月28日 14:20',
    expire_time: '2026-06-30 23:59',
    expire_time_text: '6月30日 23:59',
    scope: '积分成员',
    status: 'active',
    is_pinned: 0,
  },
  {
    id: 1009,
    room_id: 1,
    title: '季度复盘会议纪要',
    summary: 'Q1 群运营复盘要点与下阶段计划摘要。',
    content: '会议纪要已整理，包含活动数据、成员反馈与下季度重点方向。',
    cover:
      'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=480&q=80',
    publisher: 'Admin',
    publish_time: '2026-04-25 11:00',
    publish_time_text: '4月25日 11:00',
    expire_time: '2026-05-25 23:59',
    expire_time_text: '5月25日 23:59',
    scope: '管理员与骨干',
    status: 'active',
    is_pinned: 0,
  },
]

export interface GroupAnnouncementListResponse {
  current_page: number
  last_page: number
  data: GroupAnnouncementItem[]
}

export const MOCK_GROUP_ANNOUNCEMENT_PAGE_SIZE = 3

const sortAnnouncementList = (list: GroupAnnouncementItem[]) => {
  return [...list].sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned))
}

const getFilteredAnnouncements = (roomId?: number) => {
  const normalizedRoomId = Number(roomId || 0)
  if (!normalizedRoomId) return mockGroupAnnouncements
  return mockGroupAnnouncements.filter(
    (item) => item.room_id === normalizedRoomId || item.room_id === 1,
  )
}

export const getMockGroupAnnouncementList = (roomId?: number) => {
  return sortAnnouncementList(getFilteredAnnouncements(roomId))
}

export const getMockGroupAnnouncementListPage = (
  roomId?: number,
  page = 1,
  limit = MOCK_GROUP_ANNOUNCEMENT_PAGE_SIZE,
): Promise<GroupAnnouncementListResponse> => {
  const all = sortAnnouncementList(getFilteredAnnouncements(roomId))
  const last_page = Math.max(1, Math.ceil(all.length / limit))
  const normalizedPage = Math.min(Math.max(page, 1), last_page)
  const start = (normalizedPage - 1) * limit

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        current_page: normalizedPage,
        last_page,
        data: all.slice(start, start + limit),
      })
    }, 300)
  })
}

export const getMockGroupAnnouncementDetail = (id?: number | string) => {
  const normalizedId = Number(id || 0)
  return (
    mockGroupAnnouncements.find((item) => item.id === normalizedId) || mockGroupAnnouncements[0]
  )
}
