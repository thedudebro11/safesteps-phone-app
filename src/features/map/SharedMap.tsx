import { Platform } from "react-native";

const SharedMap =
  Platform.OS === "web"
    ? require("./SharedMap.web").default
    : require("./SharedMap.native").default;

export default SharedMap;
