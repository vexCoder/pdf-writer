import {
  Button,
  CircularProgress,
  Grow,
  makeStyles,
  Typography,
} from '@material-ui/core';
import { grey, red } from '@material-ui/core/colors';
import { Publish } from '@material-ui/icons';
import React from 'react';
import DriveSVG from '../../assets/drive.svg';
import { useAuthContext } from '../Providers/Auth';
import { usePickerContext } from '../Providers/Picker';

const useStyles = makeStyles((theme) => ({
  root: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    flex: 1,
    padding: '0 1em',
    gap: 10,
    filter: 'blur(0px)',
  },
  logout: {
    ['&:hover']: {
      textDecoration: 'underline',
    },
  },
  login: {
    position: 'absolute',
    zIndex: 5,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    top: 0,
    left: 0,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    ['& ~ div']: {
      filter: 'blur(2px)',
    },
  },
}));
// "flex-1 flex flex-col items-center"
interface IMainAuth {}

const MainAuth = (props: IMainAuth) => {
  const classes = useStyles();
  const { loginToDrive, email, logout, isLogin, loading } = useAuthContext();
  const { setShow, loadFileDialog } = usePickerContext();

  return (
    <>
      <Grow in={!isLogin} unmountOnExit mountOnEnter>
        <div className={classes.login}>
          <Button
            variant="contained"
            color="primary"
            style={{
              padding: '0.5em 1em',
              textTransform: 'none',
              gridArea: '1/1',
              width: 'auto',
            }}
            onClick={() => loginToDrive()}
            startIcon={
              <img src={DriveSVG} style={{ width: '1em', height: 'auto' }} />
            }
          >
            {!loading && 'Google Drive Login'}
            {loading && (
              <CircularProgress style={{ color: 'white' }} size="1em" />
            )}
          </Button>
        </div>
      </Grow>
      <div className={classes.root} style={{ flex: isLogin ? 1 : '0 0 auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <Typography variant="h6" style={{ lineHeight: '1em' }}>
            File Upload:
          </Typography>
          <Typography
            variant="caption"
            style={{ color: grey[500], fontStyle: 'italic' }}
          >
            Choose from the 2 following methods
          </Typography>
        </div>
        <div>
          <div style={{ display: 'grid', placeItems: 'center', width: '100%' }}>
            <Button
              variant="contained"
              color="primary"
              style={{
                padding: '0.5em 1em',
                textTransform: 'none',
                gridArea: '1/1',
              }}
              fullWidth
              onClick={() => setShow((prev) => !prev)}
              disabled={!isLogin || loading}
              startIcon={
                <img src={DriveSVG} style={{ width: '1em', height: 'auto' }} />
              }
            >
              Open Picker
            </Button>
          </div>
          {!!email && (
            <Typography variant="caption">
              {`${email} (`}
              <span
                className={classes.logout}
                style={{ color: red[400], cursor: 'pointer' }}
                onClick={logout}
              >
                Logout
              </span>
              )
            </Typography>
          )}
        </div>
        <Button
          variant="contained"
          style={{ padding: '0.5em 1em', textTransform: 'none' }}
          fullWidth
          disabled={!isLogin || loading}
          startIcon={<Publish />}
          onClick={loadFileDialog}
        >
          Import
        </Button>
        <Typography
          style={{ lineHeight: '0.5em', color: grey[500] }}
          variant="caption"
        >
          File upload has a maximum of 5mb
        </Typography>
      </div>
    </>
  );
};

export default MainAuth;
