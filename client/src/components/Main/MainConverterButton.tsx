import React from 'react';
import {
  ButtonBase,
  CircularProgress,
  makeStyles,
  Typography,
} from '@material-ui/core';
import { grey } from '@material-ui/core/colors';
import { GetApp, SyncAlt } from '@material-ui/icons';
import { usePickerContext } from '../Providers/Picker';
import { useConverterContext } from '../Providers/Converter';

const useStyles = makeStyles((theme) => ({
  root: {
    position: 'relative',
    width: '100%',
    marginTop: '1em',
    padding: '0.5em',
    boxShadow: theme.shadows[4],
    borderRadius: theme.shape.borderRadius,
    background: theme.palette.primary.main,
    transition: theme.transitions.create(['background'], { duration: 300 }),
    overflow: 'hidden',
    ['&:hover']: {
      background: theme.palette.primary.dark,
    },
  },
  convertLabel: {
    gridArea: '1/1',
    fontWeight: 700,
  },
  progress: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    background: theme.palette.primary.main,
    transition: theme.transitions.create(['clip-path'], {
      duration: 300,
    }),
    left: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
}));

interface IMainConverterButton {
  status: number;
}

const MainConverterButton: React.FC<IMainConverterButton> = ({ status }) => {
  const classes = useStyles();
  const { selected, selectedFile } = usePickerContext();
  const {
    isConverting,
    isCompressing,
    convert,
    isComplete,
    key,
    download,
    downloadStatus,
  } = useConverterContext();

  const path = `polygon(0 0, ${status + 2}% 0, ${status}% 100%, 0% 100%)`;
  const fileExists = !!selected || !!selectedFile;
  return (
    <ButtonBase
      className={classes.root}
      disabled={!fileExists || isConverting}
      onClick={() => {
        if (!isConverting && !isComplete && !isCompressing) {
          if (selected) {
            convert({ id: selected?.id });
          }
          if (selectedFile) {
            convert({ file: selectedFile });
          }
        }
        if (isComplete && key && !isCompressing && !isConverting) download(key);
      }}
      style={{
        ...(isConverting && {
          background: grey[300],
        }),
        ...(!fileExists && {
          background: grey[300],
        }),
      }}
    >
      {isConverting && !isComplete && !isCompressing && (
        <>
          <div
            className={classes.progress}
            style={{ clipPath: path, zIndex: 3 }}
          >
            <ConverterStatusLabel
              status={status}
              labelColor="white"
              zIndex={2}
            />
          </div>
          <ConverterStatusLabel status={status} labelColor="black" zIndex={1} />
        </>
      )}
      {!isConverting && !isComplete && isCompressing && (
        <>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              color: 'white',
            }}
          >
            <CircularProgress style={{ color: 'white' }} size="1.2em" />
            <Typography
              variant="body1"
              className={classes.convertLabel}
              style={{ color: 'white' }}
            >
              Compressing
            </Typography>
          </div>
        </>
      )}
      {isComplete && (
        <>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              color: 'white',
            }}
          >
            <GetApp />
            <Typography
              variant="body1"
              className={classes.convertLabel}
              style={{ color: 'white' }}
            >
              {!downloadStatus && 'Download'}
              {!!downloadStatus &&
                downloadStatus < 100 &&
                `Downloading (${downloadStatus.toFixed(2)}%)`}
              {!!downloadStatus && downloadStatus >= 100 && `Download Again`}
            </Typography>
          </div>
        </>
      )}
      {!isConverting && !isComplete && !isCompressing && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            color: 'white',
          }}
        >
          <SyncAlt />
          <Typography
            variant="body1"
            className={classes.convertLabel}
            style={{ color: 'white' }}
          >
            Convert
          </Typography>
        </div>
      )}
    </ButtonBase>
  );
};

interface IConverterStatusLabel {
  status: number;
  labelColor: string;
  zIndex: number;
}

const ConverterStatusLabel = ({
  status,
  labelColor,
  zIndex,
}: IConverterStatusLabel) => {
  const classes = useStyles();
  return (
    <div style={{ zIndex }}>
      <Typography
        variant="body1"
        className={classes.convertLabel}
        style={{ color: labelColor }}
      >
        {`${status.toFixed(0)}%`}
      </Typography>
    </div>
  );
};

export default MainConverterButton;
