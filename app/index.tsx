// app/index.tsx

import { Redirect } from "expo-router";

export default function Index() {
  // send the user straight into the Home tab
  return <Redirect href="/(tabs)/home" />;
}
