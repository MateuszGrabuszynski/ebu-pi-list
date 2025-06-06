import React from 'react';
import list from '../../utils/api';
import SDK from '@bisect/ebu-list-sdk';
import { Routes, Route, BrowserRouter, useNavigate, useParams } from 'react-router-dom';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import { sidebarCollapsedAtom } from '../../store/gui/sidebar/sidebarCollapsed';
import { informationSidebarContentAtom } from '../../store/gui/informationSidebar/informationSidebarContent';
import PCapDetailsContent from './PCapDetailsContent';
import { CustomScrollbar, SidebarStreamsList, ButtonWithIconSidebarContainer } from 'components/index';
import MainContentLayout from '../Common/MainContentLayout';
import { MediaInformationPanel, ComplianceTagPanel, NetworkInformationPanel } from './InformationSidebar';
import { VideoIcon } from 'components/icons';
import './styles.scss';
import { userAtom } from '../../store/gui/user/userInfo';
import { GoogleAnalyticsHandler } from 'utils/googleAnalytics';

const buttonWithIconList = (currentStream: SDK.types.IStreamInfo) => {
    switch (currentStream.media_type) {
        case 'video':
            return [
                {
                    icon: VideoIcon,
                    text: 'Video Analysis Explained',
                    onClick: () =>
                        window.open(
                            'https://github.com/ebu/pi-list/blob/master/docs/video_timing_analysis.md',
                            '_blank'
                        ),
                },
            ];

        case 'audio':
            return [
                {
                    icon: VideoIcon,
                    text: 'Audio Analysis Explained',
                    onClick: () =>
                        window.open(
                            'https://github.com/ebu/pi-list/blob/master/docs/audio_timing_analysis.md',
                            '_blank'
                        ),
                },
            ];
        case 'ancillary_data':
            return [
                {
                    icon: VideoIcon,
                    text: 'Ancillary Analysis Explained',
                    onClick: () =>
                        window.open('https://github.com/ebu/pi-list/blob/master/docs/ancillary_data.md', '_blank'),
                },
            ];
        default:
            return [
                {
                    icon: VideoIcon,
                    text: 'Ancillary Analysis Explained',
                    onClick: () => {},
                },
            ];
    }
};

interface IStreamsList {
    id: string;
    key: string;
    type: string;
    hasError: boolean;
    fullType: string;
    protocol: string;
    transport_type: string;
}

const getKey = (key: number): string => (key + 1).toString().padStart(2, '0');

const getDataToInformationSidebar = (
    currentStream: SDK.types.IStreamInfo,
    informationSidebarContent: React.ReactElement | undefined,
    username: string
) => {
    const data = {
        usermail: username,
        content: (
            <div style={{ height: '100vh', overflow: 'auto' }}>
                <CustomScrollbar>
                    {currentStream.full_media_type !== 'unknown' ? (
                        <div className="sb-information-sidebar-content">
                            <div className="actions-and-details-container-pcap-details">
                                <span className="action-and-details-container-title">Actions & Details</span>
                                <span className="action-and-details-container-text">
                                    To zoom in on the graphs select an area with the cursor
                                </span>
                            </div>
                            <div>
                                <ButtonWithIconSidebarContainer
                                    buttonWithIconList={buttonWithIconList(currentStream)}
                                />
                            </div>
                            {informationSidebarContent ? (
                                <div className="extra-information-sidebar-content">{informationSidebarContent}</div>
                            ) : null}
                            <div>
                                <ComplianceTagPanel stream={currentStream} />
                            </div>
                            {currentStream.full_media_type !== 'video/jxsv' ? (
                                <div>
                                    <MediaInformationPanel stream={currentStream} />
                                </div>
                            ) : null}
                            <div>
                                <NetworkInformationPanel stream={currentStream} />
                            </div>
                        </div>
                    ) : (
                        <div className="sb-information-sidebar-content">
                            <div>
                                <NetworkInformationPanel stream={currentStream} />
                            </div>
                        </div>
                    )}
                </CustomScrollbar>
            </div>
        ),
    };
    return data;
};

const getStreamsToSidebarStreamsList = (streams: SDK.types.IStreamInfo[]): IStreamsList[] => {
    const streamsList: IStreamsList[] = [];
    let fullMediaType: string;
    streams.map((item, index) => {
        item.full_media_type === 'application/ttml+xml'
            ? (fullMediaType = 'application/ ttml+xml')
            : (fullMediaType = item.full_media_type);
        if (item.full_transport_type === 'SRT') {
            fullMediaType = 'SRT';
        }
        streamsList.push({
            id: item.id,
            key: getKey(index),
            hasError: item.error_list.length > 0,
            type: item.media_type === 'ancillary_data' ? 'Ancillary' : item.media_type,
            fullType: fullMediaType,
            protocol: 'ST2110',
            transport_type: item.full_transport_type,
        });
    });

    return streamsList;
};

function PCapDetailsContentHOC(props: any) {
    let params = useParams();

    const pcapID = params.pcapID;

    if (!pcapID) return <div>PCAP ID not found</div>;

    const [pcap, setPcap] = React.useState<SDK.types.IPcapInfo>();
    const [gdprConsent, setGdprConsent] = React.useState<boolean>();

    React.useEffect(() => {
        const gdprConsentLocalStorage = localStorage.getItem('gdprConsent');
        if (gdprConsentLocalStorage) {
            setGdprConsent(gdprConsentLocalStorage === 'true' ? true : false);
        }
    }, []);

    const pagePath: string = window.location.pathname;

    React.useEffect(() => {
        const loadStreams = async (): Promise<void> => {
            const pcapInfo = await list.pcap.getInfo(pcapID);
            setPcap(pcapInfo);
        };

        loadStreams();
    }, []);

    const pcapFilename = pcap?.file_name;

    const [activeStreamId, setActiveStreamId] = React.useState<string | undefined>(undefined);

    const navigate = useNavigate();

    const onItemClick = (streamID: string) => {
        setActiveStreamId(streamID);
        navigate(`/pcaps/${pcapID}/streams/${streamID}`);
    };

    const initial: SDK.types.IStreamInfo[] = [];

    const [streams, setStreams] = React.useState(initial);
    React.useEffect(() => {
        const loadStreams = async (): Promise<void> => {
            const all = await list.pcap.getStreams(pcapID);
            setStreams(all);
        };
        loadStreams();
    }, []);

    const setSidebarCollapsed = useSetRecoilState(sidebarCollapsedAtom);
    React.useEffect(() => {
        setSidebarCollapsed(true);
    }, []);

    React.useEffect(() => {
        if (streams.length === 0) return;
        const firstStreamId = streams[0].id;
        onItemClick(firstStreamId);
    }, [streams]);

    const onBackButtonClick = () => {
        navigate('/pcaps');
    };
    const informationSidebarContent = useRecoilValue(informationSidebarContentAtom);

    const userInfo = useRecoilValue(userAtom);

    if (!userInfo) {
        return null;
    }

    const currentStream: SDK.types.IStreamInfo | undefined =
        activeStreamId === undefined ? undefined : streams.find((v: any) => v.id === activeStreamId);

    const renderStream = (streams: SDK.types.IStreamInfo[]) => {
        return (
            <div className="pcap-details-content-layout">
                <GoogleAnalyticsHandler gdprConsent={gdprConsent} pathName={pagePath} />
                <div className="pcap-details-content-sidebar-streams-list">
                    <SidebarStreamsList
                        streamsList={getStreamsToSidebarStreamsList(streams)}
                        onItemClicked={onItemClick}
                        activeStreamId={activeStreamId}
                        onBackButtonClick={onBackButtonClick}
                    />
                </div>
                <div>
                    <PCapDetailsContent
                        stream={currentStream}
                        pcapFilename={pcapFilename}
                        pcapID={pcapID}
                        pcap={pcap}
                    />
                </div>
            </div>
        );
    };

    const middleContent = (
        <Routes>
            <Route path={`:streamID`} element={renderStream(streams)} />
        </Routes>
    );

    if (!currentStream) return null;

    return (
        <MainContentLayout
            middlePageContent={middleContent}
            informationSidebarContent={getDataToInformationSidebar(
                currentStream,
                informationSidebarContent,
                userInfo?.username
            )}
            logout={() => navigate('/logout')}
        />
    );
}

export default PCapDetailsContentHOC;
