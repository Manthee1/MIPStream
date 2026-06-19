CC = gcc
CFLAGS = -Wall -g -std=c99 -Iinclude -Isrc/external
LDFLAGS = -lGL -lm -lpthread -ldl -lrt -lX11

SRC = $(wildcard src/*.c) \
	  $(wildcard src/**/*.c) \
	  $(wildcard src/**/**/*.c) \

OBJ = $(SRC:.c=.o)
TARGET = mipstream

all: $(TARGET)

$(TARGET): $(OBJ)
	$(CC) $(OBJ) -o $(TARGET) $(LDFLAGS)

%.o: %.c
	$(CC) $(CFLAGS) -c $< -o $@

clean:
	rm -f $(OBJ) $(TARGET)

.PHONY: all clean
