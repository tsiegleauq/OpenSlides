import { Injectable } from '@angular/core';

/**
 * Import for native js libraries
 */
declare var JitsiMeetJS: any;

@Injectable({
    providedIn: 'root'
})
export class RtcService {
    private localTracks = [];
    private remoteTracks = {};
    private connection: any;
    private isJoined = false;

    private room: any;
    private conferenceName = 'ostest';
    private conferenceOptions = {
        openBridgeChannel: true
    };

    // XMPP service URL. For example 'wss://server.com/xmpp-websocket' for Websocket or '//server.com/http-bind' for BOSH.
    // i.e: wss://meet.jit.si/xmpp-websocket
    // private jitsiServiceUrl = 'wss://meet.jit.si/xmpp-websocket';
    // private jitsiServiceUrl = 'https://meet.jit.si/http-bind';
    private jitsiServiceUrl = 'https://meet.openslides.com/http-bind/';
    // private jitsiServiceUrl = '/jitsi/http-bind';


    // private jitsiHostDomain = 'meet.jit.si';
    private jitsiHostDomain = 'https://meet.openslides.com';
    // private jitsiHostDomain = '/jitsi/';

    // i.e: muc.meet.jitsi
    // private jitsiHostMuc = 'muc.meet.jitsi';

    // i.e: guest.meet.jit.si
    // private jitsiHostAnonymous = 'meet.jit.si';

    private connectionOptions = {
        serviceUrl: this.jitsiServiceUrl,
        hosts: {
            domain: this.jitsiHostDomain,
            // muc: this.jitsiHostMuc,
            // anonymousdomain: this.jitsiHostAnonymous
        }
    };

    public constructor() {
        JitsiMeetJS.init();
        JitsiMeetJS.setLogLevel(JitsiMeetJS.logLevels.ERROR);
        this.createConnection();
    }

    private createConnection(): void {
        this.connection = new JitsiMeetJS.JitsiConnection(null, null, this.connectionOptions);
        this.connection.addEventListener(JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED, (success: any) => {
            this.onConnectionSuccess(success);
        });
        this.connection.addEventListener(JitsiMeetJS.events.connection.CONNECTION_FAILED, this.onConnectionFailed);
        this.connection.addEventListener(JitsiMeetJS.events.connection.CONNECTION_DISCONNECTED, this.disconnect);

        JitsiMeetJS.mediaDevices.addEventListener(JitsiMeetJS.events.mediaDevices.DEVICE_LIST_CHANGED, devices => {
            console.log('current devices', devices);
        });

        JitsiMeetJS.createLocalTracks({ devices: ['audio'] })
            .then((tracks: any) => {
                this.onLocalTracks(tracks);
            })
            .catch(error => {
                throw error;
            });

        this.connection.connect();
    }

    public connect(): void {
        this.initConference();
    }

    private initConference(): void {
        this.room = this.connection.initJitsiConference(this.conferenceName, this.conferenceOptions);

        // tracks
        this.room.on(JitsiMeetJS.events.conference.TRACK_ADDED, this.onRemoteTrack);
        this.room.on(JitsiMeetJS.events.conference.TRACK_REMOVED, track => {
            console.log(`track removed: ${track}`);
        });

        this.room.on(JitsiMeetJS.events.conference.CONFERENCE_JOINED, this.onConferenceJoined);

        // users
        this.room.on(JitsiMeetJS.events.conference.USER_JOINED, id => {
            console.log('user join conference: ', id);
            this.remoteTracks[id] = [];
        });
        this.room.on(JitsiMeetJS.events.conference.USER_LEFT, this.onUserLeft);

        this.room.join();
    }

    private onConnectionSuccess(success: any): void {
        console.log('onConnectionSuccess: ', success);
        this.initConference();
    }

    private onRemoteTrack(): void {
        console.log('onRemoteTrack');
    }

    private onLocalTracks(tracks: any): void {
        this.localTracks = tracks;
        for (let i = 0; i < this.localTracks.length; i++) {
            this.localTracks[i].addEventListener(JitsiMeetJS.events.track.TRACK_AUDIO_LEVEL_CHANGED, audioLevel =>
                console.log(`Audio Level local: ${audioLevel}`)
            );
            this.localTracks[i].addEventListener(JitsiMeetJS.events.track.TRACK_MUTE_CHANGED, () =>
                console.log('local track muted')
            );
            this.localTracks[i].addEventListener(JitsiMeetJS.events.track.LOCAL_TRACK_STOPPED, () =>
                console.log('local track stoped')
            );
            this.localTracks[i].addEventListener(JitsiMeetJS.events.track.TRACK_AUDIO_OUTPUT_CHANGED, deviceId =>
                console.log(`track audio output device was changed to ${deviceId}`)
            );
            if (this.localTracks[i].getType() === 'video') {
                console.log('get video track');
            } else {
                console.log('got audio track');
            }
            if (this.isJoined) {
                this.room.addTrack(this.localTracks[i]);
            }
        }
    }

    private onConferenceJoined(): void {
        console.log('onConferenceJoined');
        this.isJoined = true;
    }

    private onConnectionFailed(error: any): void {
        console.log('onConnectionFailed', error);
    }

    private disconnect(): void {
        console.log('disconnect');
        this.connection.disconnect();
        this.isJoined = false;
    }

    private onUserLeft(id: any): void {
        console.log('a user left the session');
        if (this.remoteTracks[id]) {
            delete this.remoteTracks[id];
        }
    }
}
