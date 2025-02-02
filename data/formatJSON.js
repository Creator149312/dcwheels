const defaultWheelJSON = {
  title: "New wheel",
  description: "This is a new spinpapa wheel",
  data: [{ text: "Gabriel" }, { text: "Rahul" }, { text: "Ram" }],
  wheelData: {
    segColors: [
      "#EE4040",
      "#F0CF50",
      "#815CD1",
      "#3DA5E0",
      "#34A24F",
      "#F9AA1F",
      "#EC3F3F",
      "#FF9000",
    ],
    spinDuration: 5,
    maxNumberOfOptions: 100, //this is max number of options to show on wheel
    innerRadius: 15,
    removeWinnerAfterSpin: false,
    customPopupDisplayMessage: "The Winner is..."
  },
  editorData: {
    advOptions: false,
    visible: false,
  }
};

export default defaultWheelJSON;
