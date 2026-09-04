const BADGE_LIST_REFRESH_REQUIRED_KEY = 'badge_list_refresh_required'

export const markBadgeListRefreshRequired = () => {
  uni.setStorageSync(BADGE_LIST_REFRESH_REQUIRED_KEY, Date.now())
}

export const consumeBadgeListRefreshRequired = () => {
  const shouldRefresh = Boolean(uni.getStorageSync(BADGE_LIST_REFRESH_REQUIRED_KEY))
  if (shouldRefresh) uni.removeStorageSync(BADGE_LIST_REFRESH_REQUIRED_KEY)
  return shouldRefresh
}
