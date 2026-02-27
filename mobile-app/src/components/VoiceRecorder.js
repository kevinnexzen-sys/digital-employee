/**
 * Voice Recorder Component for KevinJr Mobile App
 * Handles voice recording and cloning functionality
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Voice from 'react-native-voice';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import HapticFeedback from 'react-native-haptic-feedback';

import { Colors, Fonts } from '../utils/Theme';
import KevinJrAPI from '../services/KevinJrAPI';

const { width } = Dimensions.get('window');

const VoiceRecorder = ({ 
  onRecordingComplete, 
  onTranscriptionComplete,
  mode = 'chat', // 'chat' or 'training'
  trainingText = null,
  style 
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [hasPermission, setHasPermission] = useState(false);
  const [audioPath, setAudioPath] = useState(null);
  const [transcription, setTranscription] = useState('');

  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;

  // Audio recorder
  const audioRecorderPlayer = useRef(new AudioRecorderPlayer()).current;
  const recordingTimer = useRef(null);

  useEffect(() => {
    initializeVoice();
    checkPermissions();
    
    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (isRecording) {
      startPulseAnimation();
      startWaveAnimation();
      startTimer();
    } else {
      stopAnimations();
      stopTimer();
    }
  }, [isRecording]);

  const initializeVoice = async () => {
    try {
      Voice.onSpeechStart = onSpeechStart;
      Voice.onSpeechEnd = onSpeechEnd;
      Voice.onSpeechResults = onSpeechResults;
      Voice.onSpeechError = onSpeechError;
    } catch (error) {
      console.error('Voice initialization error:', error);
    }
  };

  const checkPermissions = async () => {
    try {
      const result = await request(PERMISSIONS.ANDROID.RECORD_AUDIO);
      setHasPermission(result === RESULTS.GRANTED);
    } catch (error) {
      console.error('Permission error:', error);
      setHasPermission(false);
    }
  };

  const cleanup = async () => {
    try {
      await Voice.destroy();
      await audioRecorderPlayer.stopRecorder();
      await audioRecorderPlayer.stopPlayer();
      stopTimer();
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const startWaveAnimation = () => {
    Animated.loop(
      Animated.timing(waveAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    ).start();
  };

  const stopAnimations = () => {
    pulseAnim.stopAnimation();
    waveAnim.stopAnimation();
    Animated.timing(pulseAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    Animated.timing(waveAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const startTimer = () => {
    setRecordingTime(0);
    recordingTimer.current = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (recordingTimer.current) {
      clearInterval(recordingTimer.current);
      recordingTimer.current = null;
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    if (!hasPermission) {
      Alert.alert(
        'Permission Required',
        'Microphone permission is required for voice recording.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Settings', onPress: () => checkPermissions() }
        ]
      );
      return;
    }

    try {
      HapticFeedback.trigger('impactLight');
      
      const path = `${audioRecorderPlayer.dirs.CacheDir}/voice_${Date.now()}.wav`;
      
      await audioRecorderPlayer.startRecorder(path);
      setAudioPath(path);
      setIsRecording(true);
      setTranscription('');

      // Start speech recognition for chat mode
      if (mode === 'chat') {
        await Voice.start('en-US');
      }

    } catch (error) {
      console.error('Recording start error:', error);
      Alert.alert('Error', 'Failed to start recording. Please try again.');
    }
  };

  const stopRecording = async () => {
    try {
      HapticFeedback.trigger('impactMedium');
      
      const result = await audioRecorderPlayer.stopRecorder();
      setIsRecording(false);

      // Stop speech recognition
      if (mode === 'chat') {
        await Voice.stop();
      }

      // Process the recording
      if (result && audioPath) {
        await processRecording(audioPath);
      }

    } catch (error) {
      console.error('Recording stop error:', error);
      Alert.alert('Error', 'Failed to stop recording. Please try again.');
    }
  };

  const processRecording = async (path) => {
    try {
      if (mode === 'training') {
        // For voice training mode
        const audioData = await readAudioFile(path);
        onRecordingComplete && onRecordingComplete({
          audioData,
          text: trainingText,
          duration: recordingTime,
          path
        });
      } else {
        // For chat mode - send to KevinJr for processing
        const response = await KevinJrAPI.processVoiceMessage(path, transcription);
        onRecordingComplete && onRecordingComplete({
          audioPath: path,
          transcription,
          response: response.data,
          duration: recordingTime
        });
      }
    } catch (error) {
      console.error('Processing error:', error);
      Alert.alert('Error', 'Failed to process recording.');
    }
  };

  const readAudioFile = async (path) => {
    // Placeholder for reading audio file as binary data
    // In real implementation, this would read the file and return ArrayBuffer
    return new ArrayBuffer(1024); // Placeholder
  };

  const playRecording = async () => {
    if (!audioPath) return;

    try {
      HapticFeedback.trigger('impactLight');
      setIsPlaying(true);
      
      await audioRecorderPlayer.startPlayer(audioPath);
      
      audioRecorderPlayer.addPlayBackListener((e) => {
        if (e.currentPosition === e.duration) {
          setIsPlaying(false);
          audioRecorderPlayer.stopPlayer();
        }
      });

    } catch (error) {
      console.error('Playback error:', error);
      setIsPlaying(false);
    }
  };

  const stopPlayback = async () => {
    try {
      await audioRecorderPlayer.stopPlayer();
      setIsPlaying(false);
    } catch (error) {
      console.error('Stop playback error:', error);
    }
  };

  // Voice recognition callbacks
  const onSpeechStart = () => {
    console.log('Speech recognition started');
  };

  const onSpeechEnd = () => {
    console.log('Speech recognition ended');
  };

  const onSpeechResults = (e) => {
    if (e.value && e.value.length > 0) {
      const text = e.value[0];
      setTranscription(text);
      onTranscriptionComplete && onTranscriptionComplete(text);
    }
  };

  const onSpeechError = (e) => {
    console.error('Speech recognition error:', e);
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const togglePlayback = () => {
    if (isPlaying) {
      stopPlayback();
    } else {
      playRecording();
    }
  };

  const renderWaveform = () => {
    const waves = Array.from({ length: 5 }, (_, i) => {
      const animatedStyle = {
        opacity: waveAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.3, 1],
        }),
        transform: [{
          scaleY: waveAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0.5, 1.5 + Math.random() * 0.5],
          }),
        }],
      };

      return (
        <Animated.View
          key={i}
          style={[styles.waveBar, animatedStyle, { 
            marginHorizontal: 2,
            animationDelay: i * 100 
          }]}
        />
      );
    });

    return <View style={styles.waveform}>{waves}</View>;
  };

  return (
    <View style={[styles.container, style]}>
      {mode === 'training' && trainingText && (
        <View style={styles.trainingTextContainer}>
          <Text style={styles.trainingText}>{trainingText}</Text>
        </View>
      )}

      <View style={styles.recordingArea}>
        {isRecording && renderWaveform()}
        
        <Animated.View style={[
          styles.recordButtonContainer,
          { transform: [{ scale: pulseAnim }] }
        ]}>
          <TouchableOpacity
            style={[
              styles.recordButton,
              isRecording && styles.recordButtonActive
            ]}
            onPress={toggleRecording}
            activeOpacity={0.8}
          >
            <Icon
              name={isRecording ? 'stop' : 'mic'}
              size={32}
              color={Colors.white}
            />
          </TouchableOpacity>
        </Animated.View>

        {isRecording && (
          <View style={styles.recordingInfo}>
            <Text style={styles.recordingTime}>
              {formatTime(recordingTime)}
            </Text>
            <Text style={styles.recordingStatus}>
              {mode === 'training' ? 'Recording sample...' : 'Listening...'}
            </Text>
          </View>
        )}

        {!isRecording && audioPath && (
          <View style={styles.playbackControls}>
            <TouchableOpacity
              style={styles.playButton}
              onPress={togglePlayback}
              activeOpacity={0.8}
            >
              <Icon
                name={isPlaying ? 'pause' : 'play-arrow'}
                size={24}
                color={Colors.primary}
              />
            </TouchableOpacity>
            <Text style={styles.playbackText}>
              {isPlaying ? 'Playing...' : 'Tap to play'}
            </Text>
          </View>
        )}

        {transcription && mode === 'chat' && (
          <View style={styles.transcriptionContainer}>
            <Text style={styles.transcriptionLabel}>Transcription:</Text>
            <Text style={styles.transcriptionText}>{transcription}</Text>
          </View>
        )}
      </View>

      <View style={styles.instructions}>
        <Text style={styles.instructionText}>
          {mode === 'training' 
            ? 'Read the text above clearly and naturally'
            : isRecording 
              ? 'Speak your message...' 
              : 'Tap and hold to record'
          }
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 20,
  },
  trainingTextContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    width: '100%',
  },
  trainingText: {
    fontSize: 16,
    lineHeight: 24,
    color: Colors.text,
    fontFamily: Fonts.medium,
    textAlign: 'center',
  },
  recordingArea: {
    alignItems: 'center',
    marginBottom: 30,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    marginBottom: 20,
  },
  waveBar: {
    width: 4,
    height: 20,
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  recordButtonContainer: {
    marginBottom: 20,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  recordButtonActive: {
    backgroundColor: Colors.error,
  },
  recordingInfo: {
    alignItems: 'center',
  },
  recordingTime: {
    fontSize: 24,
    fontFamily: Fonts.bold,
    color: Colors.primary,
    marginBottom: 5,
  },
  recordingStatus: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: Colors.textSecondary,
  },
  playbackControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  playbackText: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: Colors.text,
  },
  transcriptionContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 15,
    marginTop: 20,
    width: width - 40,
  },
  transcriptionLabel: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: Colors.textSecondary,
    marginBottom: 5,
  },
  transcriptionText: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.text,
    lineHeight: 20,
  },
  instructions: {
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});

export default VoiceRecorder;
