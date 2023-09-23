import { Masonry } from '@mui/lab'
import { Box, Button, CardMedia, CircularProgress, Container, Paper, Typography } from '@mui/material'
import Head from 'next/head'
import { useCallback, useEffect, useState } from 'react'
import { Result } from '../../types/result';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Analyze } from 'analyzer/components/analyze';
import { Poller } from 'analyzer/components/poller';
import { Response } from 'analyzer/components/response';

export default function Home() {
  const [responses, setResponses] = useState<Result[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isAnalyzeOpen, setIsAnalyzeOpen] = useState<boolean>(false);
  const [pollingId, setPollingId] = useState<string | undefined>(undefined);
  const [selectedResponse, setSelectedReponse] = useState<Result | undefined>(undefined);

  const handleJobCreated = (id: string) => {
    setPollingId(id);
  };

  const getAllAnalyzedDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const resp = await axios.get<{ results: Result[] }>('/api/ai/analyzed');
      setResponses(resp.data.results);
    } catch (err) {
      toast('Error while loading analyzed documents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    getAllAnalyzedDocuments();
  }, [getAllAnalyzedDocuments]);

  return (
    <>
      <Head>
        <title>Analyzer | Lakindu Hewawasam</title>
      </Head>

      <Container
        maxWidth='xl'
        sx={{ my: 6 }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', flexDirection: 'column', alignItems: 'center' }}>
          <Typography
            variant='h2'
          >
            Document Analyzer
          </Typography>
          <Button
            sx={{ my: 2 }}
            variant='contained'
            onClick={() => setIsAnalyzeOpen(true)}
          >
            Analyze
          </Button>
        </Box>
        {loading && <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', my: 15 }}>
          <CircularProgress />
        </Box>}
        {!loading && <Masonry columns={3} spacing={2}>
          {responses.map((response) => <Paper
            key={response.id}
            sx={{ p: 1, cursor: 'pointer', width: '50%' }}
            onClick={() => setSelectedReponse(response)}
          >
            <img
              src={`/asset/${response.id}`}
              width="100%"
            />
          </Paper>)}
          {pollingId && <Poller
            id={pollingId}
            onPollCompleted={(resp: Result) => {
              setResponses((prev) => [resp, ...prev])
              setPollingId(undefined);
            }}
          />}
        </Masonry>}
      </Container>
      <Analyze
        open={isAnalyzeOpen}
        onClose={() => setIsAnalyzeOpen(false)}
        onJobCreated={handleJobCreated} />
      {selectedResponse && <Response
        result={selectedResponse}
        open
        onClose={() => setSelectedReponse(undefined)}
      />}

    </>
  )
}
