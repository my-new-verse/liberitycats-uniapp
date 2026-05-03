<template>
  <view class="custom-tabbar">
    <view
      v-for="(item, index) in tabbarList"
      :key="index"
      class="tabbar-item"
      :class="{ 'tabbar-item--active': current === index }"
      @tap="handleTabClick(index, item.pagePath)"
    >
      <view class="tabbar-item-content">
        <image
          :src="current === index ? item.selectedIconPath : item.iconPath"
          class="tabbar-item__icon"
          mode="aspectFit"
        />
        <!-- <text class="tabbar-item__text" v-if="index !== 2">{{ item.text }}</text> -->
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getServerOnOff } from '@/utils'

const props = defineProps<{
  current?: number
}>()

const current = ref(props.current || 0)
const tabbarList = ref([
  {
    pagePath: '/pages/tabbar/home',
    iconPath: '/static/LibertyCats/type=off.png',
    selectedIconPath: '/static/LibertyCats/type=on.png',
    text: '首页',
  },
  {
    pagePath: '/pages/tabbar/mall',
    iconPath: '/static/LibertyCats/type=off-1.png',
    selectedIconPath: '/static/LibertyCats/type=on-1.png',
    text: '商城',
  },
  // {
  //   pagePath: '/pages/tabbar/game',
  //   iconPath: '/static/images/game/game@2x.png',
  //   selectedIconPath: '/static/images/game/game@2x.png',
  //   text: '游戏',
  // },
  {
    pagePath: '/pages/tabbar/discover',
    iconPath: '/static/LibertyCats/type=off-2.png',
    selectedIconPath: '/static/LibertyCats/type=on-2.png',
    text: '发现',
  },
  {
    pagePath: '/pages/tabbar/my',
    iconPath: '/static/LibertyCats/type=off-3.png',
    selectedIconPath: '/static/LibertyCats/type=on-3.png',
    text: '我的',
  },
])

const handleTabClick = (index: number, url: string) => {
  if (current.value === index) return
  current.value = index
  uni.switchTab({ url: '/' + url.replace(/^\//, '') }) // 保证只有一个 /
}

// 更新当前选中的tab
const updateCurrentTab = () => {
  const pages = getCurrentPages()
  if (!pages.length) return
  const currentPage = pages[pages.length - 1]
  const currentPath = '/' + currentPage.route
  const currentIndex = tabbarList.value.findIndex((item) => item.pagePath === currentPath)
  if (currentIndex !== -1) {
    current.value = currentIndex
  }
}

onShow(updateCurrentTab)
const showGame = () => {
  const gameOption = {
    pagePath: '/pages/tabbar/game',
    iconPath: '/static/images/game/game@2x.png',
    selectedIconPath: '/static/images/game/game@2x.png',
    text: '游戏',
  }
  if (!getServerOnOff('minigame_enable', 'common')) return
  tabbarList.value.splice(2, 0, gameOption)
}
// 添加页面切换监听
onMounted(() => {
  // 初始化时更新一次
  showGame()
  updateCurrentTab()
})
</script>

<style lang="scss" scoped>
$tabbar-height: 50px;
$tabbar-item-icon-size: 32px;
$tabbar-center-icon-size: 40px;
$tabbar-text-size: 10px;
$tabbar-active-color: #ff6b03;

.custom-tabbar {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 1000;
  display: flex;
  height: $tabbar-height;
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
  background-color: #ffffff;
  box-shadow: 0 -1px 0 0 rgba(0, 0, 0, 0.05);
}

.tabbar-item {
  position: relative;
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  height: 100%;

  &-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  &__icon {
    width: $tabbar-item-icon-size;
    height: $tabbar-item-icon-size;
    margin-bottom: 2px;
    transition: transform 0.2s;
  }

  &__text {
    font-size: $tabbar-text-size;
    line-height: 1.2;
    color: #999;
    transition: color 0.2s;
  }

  &--active {
    .tabbar-item__text {
      font-weight: 500;
      color: $tabbar-active-color;
    }
  }

  &:active {
    .tabbar-item__icon {
      transform: scale(0.9);
    }
  }
}

// 中间按钮特殊样式
.tabbar-item:nth-child(3):nth-last-child(3) {
  .tabbar-item-content {
    .tabbar-item__icon {
      width: $tabbar-center-icon-size;
      height: $tabbar-center-icon-size;
    }
  }
}

.tabbar-item:nth-child(2) {
  top: 0.5rpx;
}

// 平板适配
@media (min-width: 768px) {
  .custom-tabbar {
    left: 50%;
    max-width: 750px;
    transform: translateX(-50%);
  }
}
</style>
