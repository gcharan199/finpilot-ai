import { Redirect } from "expo-router";
import { useLock } from "../src/lib/lock";

/** Entry route: send the user to the lock screen until they unlock. */
export default function Index() {
  const { unlocked } = useLock();
  return <Redirect href={unlocked ? "/(tabs)" : "/lock"} />;
}
