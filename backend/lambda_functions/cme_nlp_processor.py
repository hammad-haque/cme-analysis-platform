"""
CME NLP Processor - Test Intent Detection and Demeanor Analysis
Implements Steps 4 & 7 from the technical documentation
"""

import json
import boto3
import logging
import re
from typing import Dict, Any, List, Tuple, Optional
from decimal import Decimal
import time

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize AWS clients
comprehend_client = boto3.client('comprehend')
bedrock_client = boto3.client('bedrock-runtime')

# Comprehensive Medical Test Taxonomy for CME/IME Detection
# Based on common physical examination tests in medico-legal contexts
TEST_TAXONOMY = {
    'range_of_motion': {
        'keywords': ['range of motion', 'rom', 'flexion', 'extension', 'limited', 'measured in degrees', 'restricted'],
        'patterns': [
            r'range\s+of\s+motion\s+(?:was\s+)?measured',
            r'(?:flexion|extension)\s+(?:were|was)\s+limited',
            r'rom\s+(?:is\s+)?restricted',
            r'limited\s+(?:in\s+)?all\s+planes'
        ],
        'category': 'orthopedic',
        'priority': 'high'
    },
    'straight_leg_raise': {
        'keywords': ['straight leg raise', 'slr', 'positive at', 'negative straight', 'lasegue'],
        'patterns': [
            r'straight\s+leg\s+raise\s+(?:was\s+)?positive',
            r'slr\s+(?:positive|negative)',
            r'negative\s+straight[-\s]leg\s+raise'
        ],
        'category': 'orthopedic',
        'priority': 'high'
    },
    'cross_straight_leg_raise': {
        'keywords': ['crossed straight', 'contralateral', 'well leg raise', 'opposite leg'],
        'patterns': [
            r'crossed\s+straight[-\s]leg\s+raise',
            r'contralateral\s+slr',
            r'well\s+leg\s+raise',
            r'positive\s+(?:well\s+leg|contralateral)'
        ],
        'category': 'orthopedic',
        'priority': 'medium'
    },
    'faber_test': {
        'keywords': ['faber', 'patrick', 'figure-4', 'si joint', 'hip pain'],
        'patterns': [
            r'faber\s+test',
            r'patrick[\'s]*\s+test',
            r'figure[-\s]4\s+position'
        ],
        'category': 'orthopedic',
        'priority': 'medium'
    },
    'spurlings_test': {
        'keywords': ['spurling', 'foraminal compression', 'radicular pain', 'neck'],
        'patterns': [
            r'spurling[\'s]*\s+(?:test|maneuver)',
            r'foraminal\s+compression',
            r'radicular\s+pain'
        ],
        'category': 'orthopedic',
        'priority': 'medium'
    },
    'drop_arm_test': {
        'keywords': ['drop arm', 'rotator cuff', 'lower the arm', '90° abduction'],
        'patterns': [
            r'drop\s+arm\s+test',
            r'unable\s+to\s+(?:smoothly\s+)?lower\s+(?:the\s+)?arm',
            r'arm\s+drops?\s+suddenly'
        ],
        'category': 'orthopedic',
        'priority': 'medium'
    },
    'hawkins_kennedy_test': {
        'keywords': ['hawkins', 'kennedy', 'impingement', 'shoulder pain', 'internally rotate'],
        'patterns': [
            r'hawkins[-\s]kennedy\s+test',
            r'hawkins\s+impingement',
            r'internal(?:ly)?\s+rotat(?:e|ion)'
        ],
        'category': 'orthopedic',
        'priority': 'medium'
    },
    'neer_test': {
        'keywords': ['neer', 'impingement', 'forward flexion', 'overhead'],
        'patterns': [
            r'neer[\'s]*\s+(?:test|sign)',
            r'neer\s+impingement',
            r'forced\s+forward\s+flexion'
        ],
        'category': 'orthopedic',
        'priority': 'medium'
    },
    'lachman_test': {
        'keywords': ['lachman', 'acl', 'anterior translation', 'soft endpoint', 'knee'],
        'patterns': [
            r'lachman\s+test',
            r'acl\s+(?:tear|laxity)',
            r'anterior\s+translation',
            r'soft\s+endpoint'
        ],
        'category': 'orthopedic',
        'priority': 'medium'
    },
    'mcmurray_test': {
        'keywords': ['mcmurray', 'meniscus', 'click', 'knee', 'joint line'],
        'patterns': [
            r'mcmurray[\'s]*\s+test',
            r'meniscal\s+tear',
            r'click\s+(?:in\s+)?(?:the\s+)?knee'
        ],
        'category': 'orthopedic',
        'priority': 'medium'
    },
    'phalens_test': {
        'keywords': ['phalen', 'carpal tunnel', 'wrist flexion', 'tingling', 'fingers'],
        'patterns': [
            r'phalen[\'s]*\s+(?:test|maneuver)',
            r'carpal\s+tunnel',
            r'wrist\s+flexion',
            r'tingling\s+(?:in\s+)?fingers'
        ],
        'category': 'orthopedic',
        'priority': 'medium'
    },
    'tinels_sign': {
        'keywords': ['tinel', 'tapping', 'nerve', 'tingling', 'pins and needles'],
        'patterns': [
            r'tinel[\'s]*\s+sign',
            r'tapping\s+over\s+(?:the\s+)?(?:median|ulnar)\s+nerve',
            r'pins\s+and\s+needles'
        ],
        'category': 'orthopedic',
        'priority': 'medium'
    },
    'trendelenburg_sign': {
        'keywords': ['trendelenburg', 'pelvic drop', 'hip abductor', 'one leg'],
        'patterns': [
            r'trendelenburg\s+sign',
            r'pelvic\s+drop',
            r'standing\s+on\s+one\s+leg'
        ],
        'category': 'orthopedic',
        'priority': 'medium'
    },
    'deep_tendon_reflexes': {
        'keywords': ['deep tendon', 'dtr', 'reflex', 'patellar', 'achilles', 'biceps', 'triceps', '2+', 'brisk', 'absent'],
        'patterns': [
            r'deep\s+tendon\s+reflex(?:es)?',
            r'dtr[s]*',
            r'(?:patellar|achilles|biceps|triceps)\s+reflex',
            r'reflex(?:es)?\s+(?:\d\+|brisk|absent|diminished)'
        ],
        'category': 'neurological',
        'priority': 'high'
    },
    'babinski_sign': {
        'keywords': ['babinski', 'plantar response', 'upgoing toe', 'downgoing', 'extensor'],
        'patterns': [
            r'babinski\s+sign',
            r'plantar\s+response',
            r'(?:upgoing|downgoing)\s+toe',
            r'extensor\s+plantar'
        ],
        'category': 'neurological',
        'priority': 'medium'
    },
    'hoffmanns_sign': {
        'keywords': ['hoffmann', 'flick', 'middle finger', 'thumb flexion', 'cervical'],
        'patterns': [
            r'hoffmann[\'s]*\s+(?:sign|reflex)',
            r'flick(?:ing)?\s+(?:the\s+)?middle\s+finger'
        ],
        'category': 'neurological',
        'priority': 'medium'
    },
    'clonus_test': {
        'keywords': ['clonus', 'ankle', 'sustained', 'beats', 'rhythmic'],
        'patterns': [
            r'clonus\s+(?:present|noted|absent)',
            r'sustained\s+clonus',
            r'beats\s+of\s+clonus'
        ],
        'category': 'neurological',
        'priority': 'medium'
    },
    'romberg_test': {
        'keywords': ['romberg', 'balance', 'eyes closed', 'sway', 'proprioception'],
        'patterns': [
            r'romberg\s+(?:test|sign)',
            r'balance\s+with\s+eyes\s+closed',
            r'increased\s+sway'
        ],
        'category': 'neurological',
        'priority': 'medium'
    },
    'light_touch_sensation': {
        'keywords': ['light touch', 'sensation', 'intact', 'decreased', 'dermatome'],
        'patterns': [
            r'light\s+touch\s+sensation',
            r'sensation\s+(?:is\s+)?intact',
            r'decreased\s+(?:light\s+)?touch'
        ],
        'category': 'sensory',
        'priority': 'high'
    },
    'pinprick_sensation': {
        'keywords': ['pinprick', 'sharp', 'dull', 'pin sensation', 'discrimination'],
        'patterns': [
            r'pinprick\s+sensation',
            r'sharp[/\s]dull',
            r'pin\s+sensation',
            r'sharp[/\s]dull\s+discrimination'
        ],
        'category': 'sensory',
        'priority': 'high'
    },
    'vibration_sense': {
        'keywords': ['vibration', 'tuning fork', 'vibratory', 'great toe', 'malleolus'],
        'patterns': [
            r'vibration\s+sense',
            r'vibratory\s+sensation',
            r'tuning\s+fork'
        ],
        'category': 'sensory',
        'priority': 'medium'
    },
    'proprioception': {
        'keywords': ['proprioception', 'joint position', 'position sense', 'up or down'],
        'patterns': [
            r'proprioception\s+test',
            r'joint\s+position\s+sense',
            r'position\s+sense'
        ],
        'category': 'sensory',
        'priority': 'medium'
    },
    'gait_observation': {
        'keywords': ['gait', 'antalgic', 'limping', 'walking', 'stride', 'assistive device'],
        'patterns': [
            r'gait\s+(?:was|is)\s+(?:antalgic|normal|abnormal)',
            r'limp(?:ing)?\s+noted',
            r'walking\s+(?:with|without)\s+(?:assistive\s+)?device'
        ],
        'category': 'functional',
        'priority': 'high'
    },
    'heel_walking': {
        'keywords': ['heel walk', 'walk on heels', 'dorsiflexor', 'tibialis anterior'],
        'patterns': [
            r'heel\s+walk(?:ing)?',
            r'walk(?:ing)?\s+on\s+heels',
            r'(?:able|unable)\s+to\s+walk\s+on\s+heels'
        ],
        'category': 'functional',
        'priority': 'high'
    },
    'toe_walking': {
        'keywords': ['toe walk', 'walk on toes', 'plantarflexor', 'calf', 'tiptoes'],
        'patterns': [
            r'toe\s+walk(?:ing)?',
            r'walk(?:ing)?\s+on\s+toes',
            r'(?:able|unable)\s+to\s+walk\s+on\s+toes',
            r'tiptoes'
        ],
        'category': 'functional',
        'priority': 'high'
    },
    'tandem_gait': {
        'keywords': ['tandem', 'heel-to-toe', 'balance', 'straight line'],
        'patterns': [
            r'tandem\s+(?:gait|walk)',
            r'heel[-\s]to[-\s]toe',
            r'walk(?:ing)?\s+(?:in\s+)?(?:a\s+)?straight\s+line'
        ],
        'category': 'functional',
        'priority': 'medium'
    },
    'sit_to_stand': {
        'keywords': ['sit to stand', 'rise from', 'seated position', 'chair', 'arm support'],
        'patterns': [
            r'sit[-\s]to[-\s]stand',
            r'ris(?:e|ing)\s+from\s+(?:seated|chair)',
            r'(?:needs|uses)\s+arm\s+support'
        ],
        'category': 'functional',
        'priority': 'medium'
    },
    'stair_climb': {
        'keywords': ['stair', 'climb', 'ascend', 'descend', 'step', 'railing'],
        'patterns': [
            r'stair\s+climb',
            r'ascend(?:s|ing)?\s+(?:and\s+)?descend',
            r'step\s+up\s+and\s+down',
            r'uses?\s+railing'
        ],
        'category': 'functional',
        'priority': 'medium'
    },
    'squat_and_rise': {
        'keywords': ['squat', 'rise', 'full squat', 'knee flexion', 'difficulty'],
        'patterns': [
            r'squat\s+(?:and\s+)?rise',
            r'full\s+squat',
            r'half[-\s]squat',
            r'difficulty\s+squatting'
        ],
        'category': 'functional',
        'priority': 'medium'
    },
    'axial_loading': {
        'keywords': ['axial loading', 'axial compression', 'downward pressure', 'skull', 'non-organic'],
        'patterns': [
            r'axial\s+loading',
            r'axial\s+compression',
            r'downward\s+pressure\s+on\s+(?:the\s+)?head',
            r'non[-\s]organic\s+finding'
        ],
        'category': 'simulation',
        'priority': 'high'
    },
    'simulated_rotation': {
        'keywords': ['simulated rotation', 'en bloc', 'trunk rotation', 'shoulders and pelvis', 'non-organic'],
        'patterns': [
            r'simulated\s+rotation',
            r'en\s+bloc\s+(?:rotation|trunk)',
            r'rotating?\s+shoulders\s+and\s+pelvis'
        ],
        'category': 'simulation',
        'priority': 'high'
    },
    'superficial_tenderness': {
        'keywords': ['superficial tenderness', 'light touch', 'widespread', 'non-anatomic'],
        'patterns': [
            r'superficial\s+tenderness',
            r'widespread\s+tenderness',
            r'light\s+touch\s+(?:causes|elicits)\s+pain'
        ],
        'category': 'simulation',
        'priority': 'high'
    },
    'non_anatomic_tenderness': {
        'keywords': ['non-anatomic', 'diffuse', 'broad area', 'not localized'],
        'patterns': [
            r'non[-\s]anatomic\s+tenderness',
            r'diffuse\s+(?:pain|tenderness)',
            r'broad\s+area'
        ],
        'category': 'simulation',
        'priority': 'high'
    },
    'distracted_slr': {
        'keywords': ['distracted', 'flip test', 'inconsistent', 'seated', 'supine slr'],
        'patterns': [
            r'distracted\s+(?:straight\s+leg|slr)',
            r'flip\s+test',
            r'inconsistent\s+(?:straight\s+leg|slr)',
            r'seated\s+(?:vs\s+)?supine'
        ],
        'category': 'simulation',
        'priority': 'high'
    },
    'give_way_weakness': {
        'keywords': ['give-way', 'giveway', 'cogwheel', 'inconsistent effort', 'regional weakness'],
        'patterns': [
            r'give[-\s]way\s+weakness',
            r'cogwheel\s+weakness',
            r'inconsistent\s+effort',
            r'regional\s+weakness'
        ],
        'category': 'simulation',
        'priority': 'high'
    },
    'hoovers_test': {
        'keywords': ['hoover', 'downward pressure', 'opposite heel', 'lack of effort'],
        'patterns': [
            r'hoover[\'s]*\s+(?:test|sign)',
            r'downward\s+pressure\s+(?:from\s+)?opposite',
            r'lack\s+of\s+effort'
        ],
        'category': 'simulation',
        'priority': 'medium'
    },
    'manual_muscle_testing': {
        'keywords': ['manual muscle', 'mmt', 'strength', '5/5', '4/5', 'muscle groups'],
        'patterns': [
            r'manual\s+muscle\s+test(?:ing)?',
            r'mmt',
            r'strength\s+(?:is\s+)?\d[/]\d',
            r'\d[/]\d\s+(?:strength|weakness)'
        ],
        'category': 'MMT',
        'priority': 'high'
    }
}

# Demeanor analysis patterns
NEGATIVE_TONE_INDICATORS = [
    'that\'s ridiculous', 'you\'re lying', 'i don\'t believe', 'that\'s impossible',
    'come on', 'really?', 'seriously?', 'you\'re exaggerating', 'that doesn\'t make sense'
]

INTERRUPTION_PATTERNS = [
    r'stop\s+(?:talking|speaking)',
    r'let\s+me\s+(?:speak|talk)',
    r'don\'t\s+(?:interrupt|talk)',
    r'be\s+quiet',
    r'shut\s+up'
]

DISMISSIVE_PATTERNS = [
    r'(?:doesn\'t|does\s+not)\s+matter',
    r'not\s+important',
    r'(?:don\'t|do\s+not)\s+care\s+about',
    r'that\'s\s+(?:irrelevant|not\s+relevant)'
]


class CMENLPProcessor:
    """Process CME transcripts for test intent detection and demeanor analysis"""
    
    def __init__(self):
        self.test_taxonomy = TEST_TAXONOMY
    
    def detect_declared_tests(self, transcript: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Step 4: Test Intent Detection
        Analyze transcript to identify declared medical tests
        
        Args:
            transcript: AWS Transcribe output with speaker labels
            
        Returns:
            List of detected test declarations with timestamps
        """
        declared_tests = []
        
        try:
            # Parse transcript items
            results = transcript.get('results', {})
            items = results.get('items', [])
            speaker_labels = results.get('speaker_labels', {})
            segments = speaker_labels.get('segments', [])
            
            # Process each segment
            for segment in segments:
                speaker = segment.get('speaker_label', 'unknown')
                
                # Only analyze examiner speech (typically speaker_0 or speaker_1)
                # In real implementation, we'd use speaker diarization to identify the examiner
                
                start_time = float(segment.get('start_time', 0))
                end_time = float(segment.get('end_time', 0))
                
                # Get transcript text for this segment
                segment_text = self._get_segment_text(segment, items)
                
                # Detect test declarations
                detected_tests = self._analyze_text_for_tests(segment_text, start_time)
                
                for test in detected_tests:
                    test['speaker'] = speaker
                    test['transcript_text'] = segment_text
                    declared_tests.append(test)
            
            logger.info(f"Detected {len(declared_tests)} test declarations")
            return declared_tests
            
        except Exception as e:
            logger.error(f"Error detecting declared tests: {str(e)}")
            return []
    
    def _get_segment_text(self, segment: Dict[str, Any], items: List[Dict[str, Any]]) -> str:
        """Extract text from a transcript segment"""
        segment_start = float(segment.get('start_time', 0))
        segment_end = float(segment.get('end_time', 0))
        
        words = []
        for item in items:
            if item.get('type') == 'pronunciation':
                item_start = float(item.get('start_time', 0))
                if segment_start <= item_start <= segment_end:
                    content = item.get('alternatives', [{}])[0].get('content', '')
                    words.append(content)
        
        return ' '.join(words)
    
    def _analyze_text_for_tests(self, text: str, timestamp: float) -> List[Dict[str, Any]]:
        """Analyze text segment for test declarations using NLP"""
        detected = []
        text_lower = text.lower()
        
        # Check each test type in taxonomy
        for test_label, test_config in self.test_taxonomy.items():
            confidence = 0.0
            
            # Check keyword matches
            keyword_matches = sum(1 for kw in test_config['keywords'] if kw in text_lower)
            if keyword_matches > 0:
                confidence += 0.3 * min(keyword_matches / len(test_config['keywords']), 1.0)
            
            # Check pattern matches
            pattern_matches = 0
            for pattern in test_config['patterns']:
                if re.search(pattern, text_lower, re.IGNORECASE):
                    pattern_matches += 1
            
            if pattern_matches > 0:
                confidence += 0.7
            
            # Check for declaration phrases
            declaration_phrases = [
                'now we', 'let\'s', 'going to', 'want to', 'need to', 
                'i\'m going to', 'i\'m checking', 'i need', 'we\'re going to'
            ]
            
            has_declaration = any(phrase in text_lower for phrase in declaration_phrases)
            if has_declaration and confidence > 0:
                confidence += 0.2
            
            # If confidence threshold met, add to detected tests
            if confidence >= 0.5:  # Threshold for detection
                detected.append({
                    'label': test_label,
                    'timestamp': timestamp,
                    'confidence': min(confidence, 1.0),
                    'matched_text': text[:200]  # First 200 chars
                })
        
        return detected
    
    def analyze_examiner_demeanor(
        self, 
        transcript: Dict[str, Any],
        examiner_speaker_label: str = 'speaker_0'
    ) -> List[Dict[str, Any]]:
        """
        Step 7: Demeanor & Tone Analysis
        Analyze examiner's tone, politeness, and behavior
        
        Args:
            transcript: AWS Transcribe output
            examiner_speaker_label: Speaker label for the examiner
            
        Returns:
            List of demeanor flags with timestamps
        """
        demeanor_flags = []
        
        try:
            results = transcript.get('results', {})
            speaker_labels = results.get('speaker_labels', {})
            segments = speaker_labels.get('segments', [])
            items = results.get('items', [])
            
            examiner_segments = [s for s in segments if s.get('speaker_label') == examiner_speaker_label]
            
            # Track consecutive examiner utterances (interruptions)
            consecutive_count = 0
            last_speaker = None
            
            for i, segment in enumerate(segments):
                speaker = segment.get('speaker_label')
                start_time = float(segment.get('start_time', 0))
                segment_text = self._get_segment_text(segment, items)
                
                # Count consecutive examiner utterances (interruptions)
                if speaker == examiner_speaker_label:
                    if last_speaker == examiner_speaker_label:
                        consecutive_count += 1
                        if consecutive_count >= 2:  # 3+ consecutive utterances
                            demeanor_flags.append({
                                'flag_type': 'interruption',
                                'timestamp': start_time,
                                'transcript_excerpt': segment_text[:200],
                                'severity': 'medium',
                                'description': f'Examiner spoke {consecutive_count + 1} times consecutively'
                            })
                    else:
                        consecutive_count = 0
                    
                    # Analyze tone and sentiment
                    flags = self._analyze_tone(segment_text, start_time)
                    demeanor_flags.extend(flags)
                
                last_speaker = speaker
            
            # Use AWS Comprehend for sentiment analysis on examiner segments
            examiner_text = ' '.join([
                self._get_segment_text(s, items) for s in examiner_segments[:10]  # First 10 segments
            ])
            
            if examiner_text:
                sentiment_flags = self._analyze_sentiment_comprehend(examiner_text, examiner_segments)
                demeanor_flags.extend(sentiment_flags)
            
            logger.info(f"Detected {len(demeanor_flags)} demeanor flags")
            return demeanor_flags
            
        except Exception as e:
            logger.error(f"Error analyzing demeanor: {str(e)}")
            return []
    
    def _analyze_tone(self, text: str, timestamp: float) -> List[Dict[str, Any]]:
        """Analyze text for negative tone indicators"""
        flags = []
        text_lower = text.lower()
        
        # Check for negative tone indicators
        for indicator in NEGATIVE_TONE_INDICATORS:
            if indicator in text_lower:
                flags.append({
                    'flag_type': 'negative_tone',
                    'timestamp': timestamp,
                    'transcript_excerpt': text[:200],
                    'severity': 'high',
                    'description': f'Negative language detected: "{indicator}"'
                })
        
        # Check for dismissive patterns
        for pattern in DISMISSIVE_PATTERNS:
            if re.search(pattern, text_lower):
                flags.append({
                    'flag_type': 'dismissive',
                    'timestamp': timestamp,
                    'transcript_excerpt': text[:200],
                    'severity': 'medium',
                    'description': 'Dismissive language detected'
                })
        
        # Check for aggressive patterns
        for pattern in INTERRUPTION_PATTERNS:
            if re.search(pattern, text_lower):
                flags.append({
                    'flag_type': 'aggressive',
                    'timestamp': timestamp,
                    'transcript_excerpt': text[:200],
                    'severity': 'high',
                    'description': 'Aggressive or controlling language detected'
                })
        
        return flags
    
    def _analyze_sentiment_comprehend(
        self, 
        text: str, 
        segments: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Use AWS Comprehend for sentiment analysis"""
        flags = []
        
        try:
            # AWS Comprehend has a 5000 byte limit
            text_sample = text[:5000]
            
            response = comprehend_client.detect_sentiment(
                Text=text_sample,
                LanguageCode='en'
            )
            
            sentiment = response.get('Sentiment')
            sentiment_score = response.get('SentimentScore', {})
            
            # Flag negative sentiment
            if sentiment == 'NEGATIVE' and sentiment_score.get('Negative', 0) > 0.6:
                flags.append({
                    'flag_type': 'negative_sentiment',
                    'timestamp': float(segments[0].get('start_time', 0)) if segments else 0,
                    'transcript_excerpt': text_sample[:200],
                    'severity': 'medium',
                    'description': f'Overall negative sentiment detected (score: {sentiment_score.get("Negative"):.2f})',
                    'sentiment_scores': sentiment_score
                })
            
        except Exception as e:
            logger.error(f"Error in Comprehend sentiment analysis: {str(e)}")
        
        return flags
    
    def extract_medical_entities(self, text: str) -> List[Dict[str, Any]]:
        """Extract medical entities using AWS Comprehend Medical"""
        entities = []
        
        try:
            response = comprehend_client.detect_entities_v2(
                Text=text[:20000]  # Comprehend Medical limit
            )
            
            for entity in response.get('Entities', []):
                entities.append({
                    'text': entity.get('Text'),
                    'category': entity.get('Category'),
                    'type': entity.get('Type'),
                    'score': entity.get('Score'),
                    'begin_offset': entity.get('BeginOffset'),
                    'end_offset': entity.get('EndOffset')
                })
            
            return entities
            
        except Exception as e:
            logger.error(f"Error extracting medical entities: {str(e)}")
            return []


def process_transcript_for_cme_analysis(
    session_id: str,
    transcript_data: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Main processing function for CME transcript analysis
    Combines test intent detection and demeanor analysis
    **NOW WITH DYNAMODB PERSISTENCE**
    """
    import os
    import boto3
    
    dynamodb = boto3.resource('dynamodb')
    steps_table = dynamodb.Table(os.environ.get('CME_STEPS_TABLE', 'cme-declared-steps'))
    demeanor_table = dynamodb.Table(os.environ.get('CME_DEMEANOR_TABLE', 'cme-demeanor-flags'))
    sessions_table = dynamodb.Table(os.environ.get('CME_SESSIONS_TABLE', 'cme-sessions'))
    
    processor = CMENLPProcessor()
    
    # Step 4: Detect declared tests
    declared_tests = processor.detect_declared_tests(transcript_data)
    
    # *** PERSIST DECLARED TESTS TO DYNAMODB ***
    persisted_step_ids = []
    for test in declared_tests:
        step_id = f"step_{int(time.time())}_{len(persisted_step_ids)}"
        
        step_item = {
            'declared_step_id': step_id,
            'session_id': session_id,
            'timestamp': test.get('timestamp', 0),
            'label': test.get('label', 'unknown'),
            'transcript_text': test.get('matched_text', ''),
            'confidence': test.get('confidence', 0.0),
            'video_snippet_uri': '',
            'created_at': int(time.time())
        }
        
        steps_table.put_item(Item=step_item)
        persisted_step_ids.append(step_id)
        logger.info(f"Persisted declared step: {step_id} - {test.get('label')}")
    
    # Step 7: Analyze demeanor
    demeanor_flags = processor.analyze_examiner_demeanor(transcript_data)
    
    # *** PERSIST DEMEANOR FLAGS TO DYNAMODB ***
    persisted_flag_ids = []
    for flag in demeanor_flags:
        flag_id = f"flag_{int(time.time())}_{len(persisted_flag_ids)}"
        
        flag_item = {
            'flag_id': flag_id,
            'session_id': session_id,
            'timestamp': flag.get('timestamp', 0),
            'flag_type': flag.get('flag_type', 'unknown'),
            'transcript_excerpt': flag.get('transcript_excerpt', ''),
            'severity': flag.get('severity', 'low'),
            'description': flag.get('description', ''),
            'created_at': int(time.time())
        }
        
        demeanor_table.put_item(Item=flag_item)
        persisted_flag_ids.append(flag_id)
        logger.info(f"Persisted demeanor flag: {flag_id} - {flag.get('flag_type')}")
    
    # Update session status
    sessions_table.update_item(
        Key={'session_id': session_id},
        UpdateExpression='SET processing_stage = :stage, updated_at = :updated',
        ExpressionAttributeValues={
            ':stage': 'video_analysis',
            ':updated': int(time.time())
        }
    )
    
    logger.info(f"NLP Analysis complete: {len(declared_tests)} tests, {len(demeanor_flags)} flags")
    
    return {
        'session_id': session_id,
        'declared_tests': declared_tests,  # Return for Step Function to map over
        'demeanor_flags': demeanor_flags,
        'persisted_step_ids': persisted_step_ids,
        'persisted_flag_ids': persisted_flag_ids,
        'processing_timestamp': int(time.time()),
        'status': 'completed'
    }


def enhanced_test_detection_with_ai(transcript_text: str) -> List[Dict[str, Any]]:
    """
    Use Claude/Bedrock for enhanced test detection
    Fallback when pattern matching isn't sufficient
    """
    try:
        prompt = f"""You are analyzing a transcript of a Compulsory Medical Examination (CME). 
Extract all instances where the examiner declares they are performing a specific medical test or examination.

Transcript:
{transcript_text[:4000]}

For each declared test, return JSON with:
- test_type: The type of medical test (e.g., "lumbar_rom", "straight_leg_raise", "gait", "reflex")
- declaration: The exact words the examiner used
- approximate_time: An estimate of when this occurred in the conversation (e.g., "early", "middle", "late")

Return ONLY a JSON array of test declarations, no additional text:
[{{"test_type": "...", "declaration": "...", "approximate_time": "..."}}]"""

        response = bedrock_client.invoke_model(
            modelId="anthropic.claude-3-sonnet-20240229-v1:0",
            body=json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 1500,
                "messages": [{
                    "role": "user",
                    "content": prompt
                }]
            })
        )
        
        response_body = json.loads(response['body'].read())
        ai_result = response_body.get('content', [{}])[0].get('text', '[]')
        
        # Parse AI response
        tests = json.loads(ai_result)
        return tests
        
    except Exception as e:
        logger.error(f"Error in AI-enhanced test detection: {str(e)}")
        return []


def handler(event, context):
    """
    Lambda handler for Step Functions invocation
    """
    try:
        logger.info(f"NLP Processor invoked: {json.dumps(event)}")
        
        session_id = event['session_id']
        transcript_data = event.get('transcript_data')
        
        # If transcript_data not provided, fetch from S3
        if not transcript_data:
            transcript_uri = event.get('transcript_uri')
            if transcript_uri:
                # Download transcript from S3
                import boto3
                s3_client = boto3.client('s3')
                
                if transcript_uri.startswith('s3://'):
                    uri_parts = transcript_uri.replace('s3://', '').split('/', 1)
                    bucket = uri_parts[0]
                    key = uri_parts[1]
                    
                    response = s3_client.get_object(Bucket=bucket, Key=key)
                    transcript_json = response['Body'].read().decode('utf-8')
                    transcript_data = json.loads(transcript_json)
        
        # Process transcript
        result = process_transcript_for_cme_analysis(session_id, transcript_data)
        
        return {
            'statusCode': 200,
            **result
        }
        
    except Exception as e:
        logger.error(f"Error in NLP processor handler: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise e

