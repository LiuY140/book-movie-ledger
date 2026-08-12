/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // 基础色系 — 从原型移植
        paper: '#F6F3EE',
        card: '#FFFDF9',
        ink: {
          DEFAULT: '#2B2A26',
          2: '#6F6A5E',
          3: '#A39D90',
        },
        line: {
          DEFAULT: '#E7E1D4',
          2: '#EFEAE0',
        },
        // 主色系
        green: {
          DEFAULT: '#2E5E4E',
          deep: '#23493C',
          ink: '#1C3A2F',
          soft: '#E7EEE9',
        },
        amber: {
          DEFAULT: '#C07A2E',
          deep: '#9C5F22',
          soft: '#F7EDE0',
        },
        // 状态色
        done: { DEFAULT: '#3E7C59', soft: '#E5F0E9' },
        doing: { DEFAULT: '#C07A2E', soft: '#F7EDE0' },
        want: { DEFAULT: '#6B7A99', soft: '#E9EDF4' },
        give: { DEFAULT: '#9A958B', soft: '#EFEEE9' },
        star: '#E0A33A',
        danger: { DEFAULT: '#B05656', soft: '#F9ECEC' },
      },
      fontFamily: {
        serif: ['Georgia', '"Songti SC"', '"STSong"', '"Noto Serif SC"', '"SimSun"', 'serif'],
        sans: ['-apple-system', 'BlinkMacSystemFont', '"PingFang SC"', '"Microsoft YaHei"', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        lg: '18px',
        md: '12px',
        sm: '8px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(43,42,38,.04), 0 8px 24px -12px rgba(43,42,38,.14)',
        lift: '0 2px 6px rgba(43,42,38,.06), 0 18px 44px -16px rgba(43,42,38,.22)',
      },
    },
  },
  plugins: [],
};
