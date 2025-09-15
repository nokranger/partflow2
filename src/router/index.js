import Vue from "vue";
import VueRouter from "vue-router";
// import HomeView from "../views/HomeView.vue";
import LayoutPage from '@/views/LayoutPage.vue' // แก้ path ให้ตรงกับโครงสร้างโปรเจกต์

Vue.use(VueRouter);

const routes = [
  // {
  //   path: "/",
  //   name: "home",
  //   component: HomeView,
  // },
  {
    path: "/about",
    name: "about",
    // route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () =>
      import(/* webpackChunkName: "about" */ "../views/AboutView.vue"),
  },
  {
    path: '/',
    name: 'SelectProcess',
    component: () => import('@/views/SelectProcess.vue')
  },
  {
    path: '/layout',      // URL ที่จะเปิด
    name: 'LayoutPage',   // ต้องตรงกับ name ใน this.$router.push
    component: LayoutPage
  },
  {
    path: '/layoutB',      // URL ที่จะเปิด
    name: 'LayoutPageB',   // ต้องตรงกับ name ใน this.$router.push
    component: () => import('@/views/LayoutPageB.vue')
  },
  {
    path: '/answer-check',
    name: 'AnswerCheckPage',
    component: () => import('@/views/AnswerCheckPage.vue')
  },
  {
    path: '/answer-checkB',
    name: 'AnswerCheckPageB',
    component: () => import('@/views/AnswerCheckPageB.vue')
  }
];

const router = new VueRouter({
  mode: "history",
  base: process.env.BASE_URL,
  routes,
});

export default router;
