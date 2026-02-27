Component({
  properties: {
    // 小兔子样式
    rabbitStyle: {
      type: String,
      value: "left: 50%; top: 50%; --tilt: 0deg; --stretch: 1;",
    },
    // 小兔子朝向和动作
    rabbitClass: {
      type: String,
      value: "face-right motion-idle",
    },
    // 兼容旧版企鹅属性名
    penguinStyle: {
      type: String,
      value: "left: 50%; top: 50%; --tilt: 0deg; --stretch: 1;",
    },
    penguinClass: {
      type: String,
      value: "face-right motion-idle",
    },
  },
});
