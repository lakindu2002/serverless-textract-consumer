import { FC } from "react";
import { Result } from "../../types/result";
import { Box, Dialog, DialogContent, DialogProps, DialogTitle, Divider, Paper, Typography } from "@mui/material";

interface ResponseProps extends DialogProps {
  result: Result;
}

export const Response: FC<ResponseProps> = ({ result, ...rest }) => {
  const { responses = [], id } = result;
  console.log(responses);
  return (
    <>
      <Dialog
        {...rest}
        maxWidth='lg'
        PaperProps={{
          sx: {
            width: '100%',
            height: '100%'
          }
        }}
      >
        <DialogTitle>
          View Analysis Result
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            <img src={`/asset/${id}`}
              style={{
                width: '75%'
              }}
            />
          </Box>

          <Divider sx={{ my: 2 }} />
          {responses.map((response, index) =>
            <Paper
              key={index}
              sx={{ p: 2, mb: 2 }}
            >
              <Typography
                fontWeight={500}
              >
                {response.query}
              </Typography>
              <Typography
              >
                {response.answer}
              </Typography>
              <Typography>
                (Confidence Score: {response.confidence})
              </Typography>
            </Paper>
          )}

        </DialogContent>
      </Dialog>

    </>
  )
};
