import { StyleSheet, View } from "react-native";
import { colors } from "../lib/theme";

type Status = "online" | "away" | "offline" | "busy";

const dotColor: Record<Status, string> = {
  online: colors.presenceOnline,
  away: colors.presenceAway,
  offline: colors.presenceOffline,
  busy: colors.presenceBusy,
};

type Props = {
  status?: Status;
  size?: number;
};

export function PresenceDot({ status = "offline", size = 10 }: Props) {
  return (
    <View
      style={[
        styles.dot,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: dotColor[status],
          borderWidth: size > 8 ? 2 : 1.5,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  dot: {
    borderColor: colors.canvas,
  },
});
