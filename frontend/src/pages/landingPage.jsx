import React, { useState } from 'react'
import "../App.css"
import { useNavigate } from 'react-router-dom'
import {
    logoImg,
    landingHeroImg,
    featureVideoImg,
    featureScreenImg,
    featurePollImg,
    featureModerationImg,
    featureNotesImg,
    featureReactionsImg,
    featureScheduleImg,
    featureHistoryImg
} from '../assets/images'
import VideocamIcon from '@mui/icons-material/Videocam';
import SecurityIcon from '@mui/icons-material/Security';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import PollIcon from '@mui/icons-material/Poll';
import NoteAltIcon from '@mui/icons-material/NoteAlt';
import RestoreIcon from '@mui/icons-material/Restore';
import BackHandIcon from '@mui/icons-material/BackHand';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Typography from '@mui/material/Typography';

export default function LandingPage() {
    const router = useNavigate();
    const [activeFeatureTab, setActiveFeatureTab] = useState(0);

    const featureHighlights = [
        {
            title: "HD Video & Active Speaker Focus",
            desc: "Dynamic layout grid automatically highlights the active speaker with clean visual indicators and maintains crisp video clarity.",
            tag: "High Definition Video",
            image: "/feature-video.jpg"
        },
        {
            title: "Real-Time Interactive Polls",
            desc: "Gather quick team decisions with live polling questions. Votes calculate automatically with real-time percentage progress bars.",
            tag: "Team Voting",
            image: "/feature-poll.jpg"
        },
        {
            title: "One-Click Screen Sharing",
            desc: "Present your desktop, specific application window, or browser tab effortlessly without leaving the conference interface.",
            tag: "Desktop & Tab Share",
            image: "/feature-screen.jpg"
        },
        {
            title: "Host Moderation & Room Lock",
            desc: "Host moderation controls let you mute participants, remove disruptive users, or lock the meeting room to prevent new entries.",
            tag: "Room Security",
            image: "/feature-moderation.jpg"
        },
        {
            title: "Shared Meeting Notes & Export",
            desc: "Collaborate on shared meeting notes in real time during the call and export them directly as a text file for your records.",
            tag: "Live Documentation",
            image: "/feature-notes.jpg"
        },
        {
            title: "Raise Hand & Live Reactions",
            desc: "Signal to speak with hand raising and send animated emoji reactions during calls.",
            tag: "Participant Engagement",
            image: "/showcase-reactions.png"
        },
        {
            title: "Schedule & Share Links",
            desc: "Schedule upcoming meetings with custom room titles and copy shareable links instantly.",
            tag: "Meeting Planning",
            image: "/showcase-schedule.png"
        },
        {
            title: "Meeting History Log",
            desc: "Review past call logs from your personal dashboard and quickly rejoin active meeting rooms.",
            tag: "Call Records",
            image: "/showcase-history.png"
        }
    ];

    return (
        <div className='landingPageContainer'>
            {/* Top Navigation Bar */}
            <nav>
                <div className='navBrand' onClick={() => router("/")}>
                    <img src={logoImg} alt="NovaCall Logo" />
                    <h2>Nova<span>Call</span></h2>
                </div>
                <div className='navlist'>
                    <a href="#features" className="navLink">Features</a>
                    <span className="navLink" onClick={() => router("/auth?mode=signin")}>Sign In</span>
                    <div onClick={() => router("/auth?mode=signup")} role='button'>
                        <button className="btnPrimary">Get Started</button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <div className="landingMainContainer">
                <div className="landingHeroContent">
                    <h1>
                        Seamless Video Meetings for <span>Effortless Team Collaboration</span>
                    </h1>

                    <p>
                        Host HD video calls, share your screen, run live polls, and take meeting notes in real time. Designed for smooth, reliable teamwork from anywhere.
                    </p>

                    <div className="heroCTA">
                        <button className="btnPrimary" style={{ fontSize: '1.05rem', padding: '0.85rem 2rem' }} onClick={() => router("/auth?mode=signup")}>
                            Start Free Meeting
                        </button>
                        <button className="btnSecondary" onClick={() => router(`/demo-${Math.random().toString(36).substring(2, 8)}`)}>
                            Try Instant Demo Call
                        </button>
                    </div>
                </div>

                <div className="landingHeroVisual">
                    <img src={landingHeroImg} alt="NovaCall Video Conference Dashboard" />
                </div>
            </div>

            {/* Core Features Grid Section (8 Feature Cards with Visual Preview Images) */}
            <div id="features" className="sectionTitle">
                <h2>Comprehensive Collaboration Features</h2>
                <p>Simple, powerful tools built directly into every NovaCall meeting room.</p>
            </div>

            <div className="featuresGrid">
                <div className="featureCard">
                    <img src="/grid-video.png" alt="HD Video Calls" className="featureCardVisual" />
                    <h3>HD Video & Clear Audio</h3>
                    <p>High-definition video streams with crisp audio clarity and active speaker visual highlighting.</p>
                </div>
                <div className="featureCard">
                    <img src="/grid-screen.png" alt="Screen Sharing" className="featureCardVisual" />
                    <h3>Instant Screen Sharing</h3>
                    <p>Share your full screen, browser tab, or application window with a single click during any meeting.</p>
                </div>
                <div className="featureCard">
                    <img src="/grid-poll.png" alt="Live Polls" className="featureCardVisual" />
                    <h3>Interactive Live Polls</h3>
                    <p>Gather instant team decisions with live polling questions and real-time vote percentage bars.</p>
                </div>
                <div className="featureCard">
                    <img src="/grid-moderation.png" alt="Host Moderation" className="featureCardVisual" />
                    <h3>Host Moderation & Lock</h3>
                    <p>Mute participants, kick disruptive users, or lock the meeting room to prevent unauthorized entries.</p>
                </div>
                <div className="featureCard">
                    <img src="/grid-notes.png" alt="Shared Notes" className="featureCardVisual" />
                    <h3>Shared Notes & Export</h3>
                    <p>Take live meeting notes together in the side panel and export them as a .txt file anytime.</p>
                </div>
                <div className="featureCard">
                    <img src="/grid-reactions.png" alt="Live Reactions" className="featureCardVisual" />
                    <h3>Raise Hand & Live Reactions</h3>
                    <p>Signal to speak with hand raising and send animated emoji reactions (👏, 👍, 🎉) during calls.</p>
                </div>
                <div className="featureCard">
                    <img src="/grid-schedule.png" alt="Meeting Scheduler" className="featureCardVisual" />
                    <h3>Schedule & Share Links</h3>
                    <p>Schedule upcoming meetings with custom room titles and copy shareable links instantly.</p>
                </div>
                <div className="featureCard">
                    <img src="/grid-history.png" alt="Meeting History" className="featureCardVisual" />
                    <h3>Meeting History Log</h3>
                    <p>Review past call logs from your personal dashboard and quickly rejoin active meeting rooms.</p>
                </div>
            </div>

            {/* Interactive Feature Showcase Section */}
            <div className="showcaseSection">
                <div className="sectionTitle" style={{ marginTop: 0 }}>
                    <h2>Explore NovaCall in Action</h2>
                    <p>Select any feature below to preview how it works in real-time meetings.</p>
                </div>

                <div className="showcaseContainer">
                    <div className="showcaseTabs">
                        {featureHighlights.map((feat, idx) => (
                            <div
                                key={idx}
                                className={`showcaseTabItem ${activeFeatureTab === idx ? 'active' : ''}`}
                                onClick={() => setActiveFeatureTab(idx)}
                            >
                                <span className="showcaseTag">{feat.tag}</span>
                                <h4>{feat.title}</h4>
                            </div>
                        ))}
                    </div>

                    <div className="showcasePreviewCard" style={{ padding: 0, overflow: 'hidden', background: 'transparent', border: 'none', boxShadow: 'none' }}>
                        <img 
                            src={featureHighlights[activeFeatureTab].image} 
                            alt={featureHighlights[activeFeatureTab].title} 
                            style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '18px', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.08)' }} 
                        />
                    </div>
                </div>
            </div>

            {/* How It Works Section */}
            <div className="stepsSection">
                <div className="sectionTitle" style={{ marginTop: 0 }}>
                    <h2>How NovaCall Works</h2>
                    <p>Get your meeting started in three simple steps—no software download required.</p>
                </div>

                <div className="stepsGrid">
                    <div className="stepCard">
                        <div className="stepNumber">1</div>
                        <h3>Create or Schedule a Room</h3>
                        <p>Generate a unique meeting room link instantly from your dashboard or schedule a call for later. Pick a time, add a title, and you're all set.</p>
                        <div style={{ marginTop: '1rem', display: 'flex', gap: '8px' }}>
                            <span style={{ background: '#EFF6FF', color: '#3B82F6', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700 }}>Instant</span>
                            <span style={{ background: '#EFF6FF', color: '#3B82F6', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700 }}>Scheduled</span>
                        </div>
                    </div>
                    <div className="stepCard">
                        <div className="stepNumber">2</div>
                        <h3>Invite Your Team</h3>
                        <p>Share the direct room link or meeting code with your colleagues or clients. They can join with one click right from their browser—no installs needed.</p>
                        <div style={{ marginTop: '1rem', display: 'flex', gap: '8px' }}>
                            <span style={{ background: '#EFF6FF', color: '#3B82F6', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700 }}>One-Click Link</span>
                            <span style={{ background: '#EFF6FF', color: '#3B82F6', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700 }}>Room Code</span>
                        </div>
                    </div>
                    <div className="stepCard">
                        <div className="stepNumber">3</div>
                        <h3>Collaborate Live</h3>
                        <p>Enjoy crystal-clear HD video, share screens, launch live polls, send emoji reactions, and take real-time notes together during the meeting.</p>
                        <div style={{ marginTop: '1rem', display: 'flex', gap: '8px' }}>
                            <span style={{ background: '#EFF6FF', color: '#3B82F6', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700 }}>HD Video</span>
                            <span style={{ background: '#EFF6FF', color: '#3B82F6', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700 }}>Screen Share</span>
                        </div>
                    </div>
                    <div className="stepCard">
                        <div className="stepNumber">4</div>
                        <h3>Review & Follow Up</h3>
                        <p>Access your full meeting history, download shared notes as PDF, DOCX, or TXT, and review past poll results securely from your personal dashboard.</p>
                        <div style={{ marginTop: '1rem', display: 'flex', gap: '8px' }}>
                            <span style={{ background: '#EFF6FF', color: '#3B82F6', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700 }}>Export Notes</span>
                            <span style={{ background: '#EFF6FF', color: '#3B82F6', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700 }}>History</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Frequently Asked Questions (FAQ) Accordion Section */}
            <div className="faqSection">
                <div className="sectionTitle">
                    <h2>Frequently Asked Questions</h2>
                    <p>Find answers to common questions about NovaCall conferencing.</p>
                </div>

                <div className="faqContainer">
                    <Accordion sx={{ mb: 1.5, borderRadius: '14px !important', border: '1px solid #E2E8F0', boxShadow: 'none' }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography sx={{ fontWeight: 700, color: '#0F172A' }}>Do I need to download any software to join a call?</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Typography sx={{ color: '#64748B' }}>
                                No. NovaCall runs directly inside your web browser (Chrome, Edge, Firefox, Safari) without any downloads or plugins. Simply click the meeting link and you're in.
                            </Typography>
                        </AccordionDetails>
                    </Accordion>

                    <Accordion sx={{ mb: 1.5, borderRadius: '14px !important', border: '1px solid #E2E8F0', boxShadow: 'none' }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography sx={{ fontWeight: 700, color: '#0F172A' }}>Can guests join a meeting without an account?</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Typography sx={{ color: '#64748B' }}>
                                Yes! Guests can enter a room code or click an invite link to join meetings instantly as a guest participant. No registration required—just enter a display name and jump in.
                            </Typography>
                        </AccordionDetails>
                    </Accordion>

                    <Accordion sx={{ mb: 1.5, borderRadius: '14px !important', border: '1px solid #E2E8F0', boxShadow: 'none' }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography sx={{ fontWeight: 700, color: '#0F172A' }}>How many participants can join a single meeting?</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Typography sx={{ color: '#64748B' }}>
                                NovaCall supports up to 50 participants per meeting room with full HD video and audio. The adaptive quality streaming engine automatically adjusts video resolution based on network conditions to keep everyone connected smoothly.
                            </Typography>
                        </AccordionDetails>
                    </Accordion>

                    <Accordion sx={{ mb: 1.5, borderRadius: '14px !important', border: '1px solid #E2E8F0', boxShadow: 'none' }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography sx={{ fontWeight: 700, color: '#0F172A' }}>How do host moderation controls work?</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Typography sx={{ color: '#64748B' }}>
                                Meeting hosts have full control over the room. You can mute individual participants or everyone at once, remove disruptive users, lock the meeting room to prevent new entries, disable chat, and even make another participant a co-host. All controls are accessible from the Participants side panel.
                            </Typography>
                        </AccordionDetails>
                    </Accordion>

                    <Accordion sx={{ mb: 1.5, borderRadius: '14px !important', border: '1px solid #E2E8F0', boxShadow: 'none' }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography sx={{ fontWeight: 700, color: '#0F172A' }}>Can I share my screen during a meeting?</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Typography sx={{ color: '#64748B' }}>
                                Absolutely! Click the Share button in the bottom toolbar and choose to share your entire screen, a specific application window, or a single browser tab. Screen sharing is in HD quality and all participants see your content in real-time with zero lag.
                            </Typography>
                        </AccordionDetails>
                    </Accordion>

                    <Accordion sx={{ mb: 1.5, borderRadius: '14px !important', border: '1px solid #E2E8F0', boxShadow: 'none' }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography sx={{ fontWeight: 700, color: '#0F172A' }}>How do live polls work?</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Typography sx={{ color: '#64748B' }}>
                                Any participant can create a live poll with a question and multiple options. Once launched, all attendees see the poll in real-time with percentage progress bars that update as votes come in. Results are displayed in beautiful visual charts for easy understanding.
                            </Typography>
                        </AccordionDetails>
                    </Accordion>

                    <Accordion sx={{ mb: 1.5, borderRadius: '14px !important', border: '1px solid #E2E8F0', boxShadow: 'none' }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography sx={{ fontWeight: 700, color: '#0F172A' }}>Is my data secure and private?</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Typography sx={{ color: '#64748B' }}>
                                Yes, all meetings are encrypted end-to-end. Your shared notes, history logs, chat records, and poll data are securely stored and accessible only by you and authorized participants. We never sell or share your meeting data with third parties.
                            </Typography>
                        </AccordionDetails>
                    </Accordion>

                    <Accordion sx={{ mb: 1.5, borderRadius: '14px !important', border: '1px solid #E2E8F0', boxShadow: 'none' }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography sx={{ fontWeight: 700, color: '#0F172A' }}>Can I test the platform before signing up?</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Typography sx={{ color: '#64748B' }}>
                                Absolutely! You can use the "Try Instant Demo Call" button on the homepage to jump into a live room immediately and test all features for free, no account required. It's the fastest way to experience what NovaCall offers.
                            </Typography>
                        </AccordionDetails>
                    </Accordion>
                </div>
            </div>

            {/* Rich Multi-Column Corporate Footer */}
            <footer className="corporateFooter">
                <div className="footerContainer">
                    <div className="footerCol brandCol">
                        <div className="footerBrand">
                            <img src={logoImg} alt="NovaCall Logo" />
                            <h3>Nova<span>Call</span></h3>
                        </div>
                        <p>
                            Professional HD video conferencing platform engineered for modern teams, seamless remote meetings, and real-time collaboration.
                        </p>
                    </div>

                    <div className="footerCol">
                        <h4>Platform</h4>
                        <a href="#features">Video Conferences</a>
                        <a href="#features">Screen Sharing</a>
                        <a href="#features">Live Polls</a>
                        <a href="#features">Meeting Notes</a>
                    </div>

                    <div className="footerCol">
                        <h4>Solutions</h4>
                        <span onClick={() => router("/auth?mode=signup")} className="footerLinkItem">Remote Teams</span>
                        <span onClick={() => router("/auth?mode=signup")} className="footerLinkItem">Online Workshops</span>
                        <span onClick={() => router("/auth?mode=signup")} className="footerLinkItem">Design Reviews</span>
                        <span onClick={() => router("/auth?mode=signup")} className="footerLinkItem">Hybrid Workplace</span>
                    </div>

                    <div className="footerCol">
                        <h4>Account & App</h4>
                        <span onClick={() => router("/auth?mode=signin")} className="footerLinkItem">Sign In</span>
                        <span onClick={() => router("/auth?mode=signup")} className="footerLinkItem">Register</span>
                        <span onClick={() => router("/history")} className="footerLinkItem">Meeting History</span>
                        <span onClick={() => router(`/demo-${Math.random().toString(36).substring(2, 8)}`)} className="footerLinkItem">Instant Demo</span>
                    </div>
                </div>

                <div className="footerBottomBar">
                    <p>© 2026 NovaCall. All rights reserved.</p>
                    <div className="footerBottomLinks">
                        <span>Privacy Policy</span>
                        <span>Terms of Service</span>
                        <span>Security Standards</span>
                    </div>
                </div>
            </footer>
        </div>
    )
}