import { makeStyles } from '@material-ui/core';
import React from 'react';
import { useInterval } from 'react-use';
import { useConverterContext } from '../Providers/Converter';
import { usePickerContext } from '../Providers/Picker';
import MainConverterButton from './MainConverterButton';
import MainConverterSelected from './MainConverterSelected';

const useStyles = makeStyles((theme) => ({
  root: {
    gridArea: '1/1',
    padding: '0 1em',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    height: '100%',
    width: '100%',
    boxSizing: 'border-box',
  },
}));

interface IMainConverter {}

const MainConverter: React.FC<IMainConverter> = ({}) => {
  const classes = useStyles();
  const {
    selected,
    setSelected,
    selectedFile,
    setSelectedFile,
  } = usePickerContext();
  const {
    getStatus,
    isConverting,
    setIsConverting,
    setIsComplete,
    isCompressing,
    setKey,
  } = useConverterContext();
  const [show, setShow] = React.useState(false);
  const [status, setStatus] = React.useState(0);
  const [localSelected, setLocalSelected] = React.useState<
    string | null | undefined
  >(null);
  const [localSelectedFile, setLocalSelectedFile] = React.useState<
    File | null | undefined
  >(null);

  React.useEffect(() => {
    if (selected) {
      setShow(true);
    }

    if (selectedFile) {
      setShow(true);
    }

    if (
      selected?.id !== localSelected ||
      selectedFile?.name !== localSelectedFile?.name
    ) {
      setIsConverting(false);
      setIsComplete(false);
    }

    if (!selected && !selectedFile) handleClose();

    setLocalSelected(selected?.id);
    setLocalSelectedFile(selectedFile);
  }, [selected, selectedFile]);

  useInterval(() => {
    if (isConverting || isCompressing) {
      getStatus().then((v) => setStatus(v));
    }
  }, 1000);

  const handleClose = () => {
    setKey(null);
    setShow(false);
    setSelectedFile(null);
    setStatus(0);
    setIsConverting(false);
    setIsComplete(false);
    setLocalSelected(null);
    setLocalSelectedFile(null);
  };
  console.log(status);
  return (
    <div className={classes.root}>
      <MainConverterSelected
        show={show}
        selected={selected}
        selectedFile={selectedFile}
        handleClose={handleClose}
        handleSelected={() => {
          setSelected(null);
          setSelectedFile(null);
        }}
      />
      <MainConverterButton status={status} />
    </div>
  );
};

export default MainConverter;
