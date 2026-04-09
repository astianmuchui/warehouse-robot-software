package mqtt

import (
	"fmt"
	"os"

	pahomqtt "github.com/eclipse/paho.mqtt.golang"
	"github.com/google/uuid"

	"github.com/astianmuchui/mobilerobot/internal/env"
)

var Client pahomqtt.Client

func Connect() pahomqtt.Client {
	broker := env.GetMQTTBroker()
	port := env.GetMQTTPort()

	opts := pahomqtt.NewClientOptions()
	opts.AddBroker(fmt.Sprintf("mqtt://%s:%d", broker, port))
	opts.SetClientID(fmt.Sprintf("%s%d", env.GetMQTTClientID(), uuid.New().ID()))

	if u := env.GetMQTTUsername(); u != "" {
		opts.SetUsername(u)
		opts.SetPassword(env.GetMQTTPassword())
	}

	opts.SetAutoReconnect(true)
	opts.SetConnectRetry(true)
	opts.SetCleanSession(false)
	opts.WillQos = 1

	opts.OnConnect = onConnect
	opts.OnConnectionLost = onConnectionLost
	opts.SetDefaultPublishHandler(messageHandler)

	client := pahomqtt.NewClient(opts)
	if token := client.Connect(); token.Wait() && token.Error() != nil {
		fmt.Fprintf(os.Stderr, "MQTT connect error: %v\n", token.Error())
		return client
	}

	Client = client
	return client
}

func Publish(topic string, payload interface{}) error {
	if Client == nil {
		return fmt.Errorf("mqtt client not connected")
	}
	token := Client.Publish(topic, 1, false, payload)
	if token.Wait() && token.Error() != nil {
		return token.Error()
	}
	return nil
}

func subscribe(c pahomqtt.Client, topic string) {
	token := c.Subscribe(topic, 1, nil)
	token.Wait()
	if token.Error() != nil {
		fmt.Fprintf(os.Stderr, "MQTT subscribe error [%s]: %v\n", topic, token.Error())
	}
}
