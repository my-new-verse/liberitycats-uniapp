import { defineUniPages } from '@uni-helper/vite-plugin-uni-pages'

export default defineUniPages({
  globalStyle: {
    navigationStyle: 'default',
    navigationBarTitleText: 'Liberty Cats',
    navigationBarBackgroundColor: '#ff6b03',
    navigationBarTextStyle: 'white',
    backgroundColor: '#FFFFFF',
    enablePullDownRefresh: false, // 确保启用下拉刷新
    onReachBottomDistance: 50, // 设置触发上拉加载的距离
  },
  easycom: {
    autoscan: true,
    custom: {
      '^wd-(.*)': 'wot-design-uni/components/wd-$1/wd-$1.vue',
      '^(?!z-paging-refresh|z-paging-load-more)z-paging(.*)':
        'z-paging/components/z-paging$1/z-paging$1.vue',
    },
  },
  tabBar: {
    color: '#999999',
    selectedColor: '#FF6B03',
    backgroundColor: '#FFFFFF',
    borderStyle: 'black',
    height: '50px',
    fontSize: '10px',
    iconWidth: '32px',
    spacing: '3px',
    list: [
      {
        iconPath: 'static/LibertyCats/type=off.png',
        selectedIconPath: 'static/LibertyCats/type=on.png',
        pagePath: 'pages/tabbar/home',
      },
      {
        iconPath: 'static/LibertyCats/type=off-1.png',
        selectedIconPath: 'static/LibertyCats/type=on-1.png',
        pagePath: 'pages/tabbar/mall',
      },
      // {
      //   pagePath: 'pages/tabbar/game',
      //   iconPath: '/static/images/game/game@2x.png',
      //   selectedIconPath: '/static/images/game/game@2x.png',
      // },
      {
        iconPath: 'static/LibertyCats/type=off-2.png',
        selectedIconPath: 'static/LibertyCats/type=on-2.png',
        pagePath: 'pages/tabbar/discover',
      },
      {
        iconPath: 'static/LibertyCats/type=off-3.png',
        selectedIconPath: 'static/LibertyCats/type=on-3.png',
        pagePath: 'pages/tabbar/my',
      },
    ],
  },
})
