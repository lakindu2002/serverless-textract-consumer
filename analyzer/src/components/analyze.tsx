import { Add, Close } from "@mui/icons-material";
import { LoadingButton } from "@mui/lab";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogProps, DialogTitle, Grid, IconButton, Paper, TextField, Typography } from "@mui/material";
import { Storage } from "aws-amplify";
import axios from "axios";
import { ChangeEvent, FC, useRef, useState } from "react";
import { toast } from "react-toastify";

interface AnalyzeProps extends DialogProps {
  onJobCreated: (id: string) => void
}

export const Analyze: FC<AnalyzeProps> = (props) => {
  const { onClose, onJobCreated, ...rest } = props;
  const [queries, setQueries] = useState<string[]>([]);
  const [file, setFile] = useState<File | undefined>(undefined);
  const [query, setQuery] = useState<string>('');
  const fileSelectorRef = useRef<HTMLInputElement>(null);
  const [sending, setSending] = useState<boolean>(false);

  const handleAnalyzeClick = async () => {
    try {
      setSending(true);
      const resp = await axios.post<{ id: string }>('/api/ai/process', {
        questions: queries,
        requirements: ["QUERIES"]
      });
      await Storage.put(`analyze/${resp.data.id}`, file, {
        provider: 'AWSS3',
      })
      onJobCreated(resp.data.id)
      toast('Sent for analysis');
      onClose?.({}, 'backdropClick');
    } catch (err) {
      console.log(err);
      toast('Could not analyze document');
    } finally {
      setSending(false);
    }
  }

  const handleAddQuery = () => {
    setQueries((prev) => ([...prev, query.trim()]));
    setQuery('');
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = (event.target.files || [])[0];
    setFile(selectedFile);
  }

  const removeQuery = (index: number) => {
    setQueries((prev) => {
      const updatedQueries = [...prev];
      updatedQueries.splice(index, 1);
      return updatedQueries;
    });
  }

  return <>
    <Dialog
      maxWidth='lg'
      PaperProps={{
        sx: {
          width: '100%',
          height: '100%'
        }
      }}
      onClose={onClose}
      {...rest}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', }}>
        <Typography variant="h6">
          Analyze Document
        </Typography>
        <IconButton
          onClick={() => onClose?.({}, 'backdropClick')}
        >
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ my: 2 }}>
          <Grid container>
            <Grid item
              xs={12}
              md={6}

            >
              <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                <Box>
                  <Button
                    variant="contained"
                    onClick={() => fileSelectorRef.current?.click()}
                  >
                    Add a File
                  </Button>
                  <input
                    ref={fileSelectorRef}
                    style={{ display: 'none' }}
                    type="file"
                    multiple={false}
                    onChange={handleFileChange}
                    accept=".pdf, .png, .jpeg, .jpg"
                  />
                  <Box sx={{ my: 3 }}>
                    {file && <>
                      {file.type.startsWith('image/') && (
                        <img src={URL.createObjectURL(file)}
                          alt="Preview"
                          width="500"
                        />
                      )}
                    </>}
                  </Box>
                </Box>
              </Box>
            </Grid>
            <Grid item
              xs={12}
              md={6}
            >
              <TextField
                label="What do you want to find out?"
                fullWidth
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                InputProps={{
                  endAdornment: (
                    <IconButton
                      disabled={!query}
                      onClick={handleAddQuery}
                    >
                      <Add />
                    </IconButton>
                  )
                }}
              />

              <Box sx={{ my: 2 }}>
                {queries.map((eachQuery, index) => <Paper
                  sx={{ p: 2, mb: 1 }}
                  key={index}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography>
                      {eachQuery}
                    </Typography>
                    <IconButton onClick={() => removeQuery(index)}>
                      <Close />
                    </IconButton>
                  </Box>
                </Paper>)}
              </Box>
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button
          variant="outlined"
          color='error'
          onClick={() => onClose?.({}, 'backdropClick')}
        >
          Close
        </Button>
        <LoadingButton
          loading={sending}
          variant="contained"
          disabled={queries.length === 0}
          onClick={handleAnalyzeClick}
        >
          Analyze
        </LoadingButton>
      </DialogActions>
    </Dialog>
  </>
};
