import type { getCommunityEmotionListItem } from '@/service/api/community'

type EmotionDetail = {
  id: number
  name: string
  icon: string
}

const idMap = new Map<number, EmotionDetail>()
const groupMap = new Map<number, getCommunityEmotionListItem>()
const nameMap = new Map<string, EmotionDetail>()

export const initEmotionTool = (groupList: getCommunityEmotionListItem[]) => {
  if (!Array.isArray(groupList)) return

  idMap.clear()
  groupMap.clear()
  nameMap.clear()

  groupList.forEach((group) => {
    const groupInfo = {
      id: group.id,
      name: group.name,
      icon: group.icon,
      emotions: [...group.emotions],
    }
    groupMap.set(group.id, groupInfo)

    group.emotions.forEach((emo) => {
      idMap.set(emo.id, emo)
      nameMap.set(emo.name, emo)
    })
  })
}

export const findEmotionById = (id?: number | null) => {
  return idMap.get(Number(id)) || null
}

export const getEmotionIconPath = (id?: number | null) => {
  return findEmotionById(id)?.icon || ''
}

export const findEmotionByName = (name: string) => {
  return nameMap.get(name) || null
}

export const getAllEmotions = () => Array.from(idMap.values())

export const clearEmotionTool = () => {
  idMap.clear()
  groupMap.clear()
  nameMap.clear()
}
