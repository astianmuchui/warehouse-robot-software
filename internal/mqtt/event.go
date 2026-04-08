package mqtt

import (
	"fmt"
	"strings"

	pahomqtt "github.com/eclipse/paho.mqtt.golang"
)


const RobotTopicPrefix = "robot/devices/"

var onConnect pahomqtt.OnConnectHandler = func(client pahomqtt.Client) {
	fmt.Println("MQTT: connected to broker")
	
	subscribe("robot/devices/#")
	
	subscribe("robot/cmd/response")
}

var onConnectionLost pahomqtt.ConnectionLostHandler = func(client pahomqtt.Client, err error) {
	fmt.Printf("MQTT: connection lost: %v\n", err)
}

var messageHandler pahomqtt.MessageHandler = func(client pahomqtt.Client, msg pahomqtt.Message) {
	topic := msg.Topic()
	payload := string(msg.Payload())

	fmt.Printf("MQTT [%s]: %s\n", topic, payload)

	parts := strings.Split(topic, "/")
	
	if len(parts) < 3 {
		return
	}

	
	subtopic := ""
	if len(parts) >= 4 {
		subtopic = strings.Join(parts[3:], "/")
	}

	errCh := make(chan error, 1)

	switch {
	case subtopic == "boot" || strings.Contains(payload, `"event":"boot"`):
		go func() { errCh <- handleBoot(payload) }()

	case subtopic == "heartbeat" || strings.Contains(payload, `"type":"heartbeat"`):
		go func() { errCh <- handleHeartbeat(payload) }()

	case subtopic == "readings" || strings.Contains(payload, `"environment":`):
		go func() { errCh <- handleReadings(payload) }()

	case strings.HasPrefix(subtopic, "events/motion") || strings.Contains(payload, `"event":"motion"`):
		go func() { errCh <- handleIMUEvent("motion", payload) }()

	case strings.HasPrefix(subtopic, "events/freefall") || strings.Contains(payload, `"event":"freefall"`):
		go func() { errCh <- handleIMUEvent("freefall", payload) }()

	case strings.HasPrefix(subtopic, "events/zero_motion") || strings.Contains(payload, `"event":"zero_motion"`):
		go func() { errCh <- handleIMUEvent("zero_motion", payload) }()

	default:
		return
	}

	go func() {
		if err := <-errCh; err != nil {
			fmt.Printf("MQTT handler error [%s]: %v\n", topic, err)
		}
	}()
}
