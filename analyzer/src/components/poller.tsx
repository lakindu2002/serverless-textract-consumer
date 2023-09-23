import axios from "axios";
import { FC, useCallback, useEffect } from "react";
import { Result } from "../../types/result";
import { Box, CircularProgress, Paper } from "@mui/material";

interface PollerProps {
  id: string;
  onPollCompleted: (result: Result) => void;
}

export const Poller: FC<PollerProps> = ({ id, onPollCompleted }) => {
  const startPolling = useCallback(() => {
    if (!id) {
      return;
    }

    const interval = setInterval(async () => {
      const resp = await axios.post<{ result: Result }>("/api/ai/poll", {
        id,
      });
      if (resp.data.result.status === "COMPLETED") {
        clearInterval(interval);
        onPollCompleted(resp.data.result);
        return;
      }
    }, 2000);
  }, [id]);

  useEffect(() => {
    startPolling();
  }, [startPolling]);

  return <>
    <Paper
      sx={{ p: 3 }}
    >
      <Box sx={{ display: 'flex', my: 3, justifyContent: 'center', alignItems: 'center' }}>
        <CircularProgress />
      </Box>
    </Paper>
  </>;
};
