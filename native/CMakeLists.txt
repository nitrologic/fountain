cmake_minimum_required(VERSION 3.30)
project(chat LANGUAGES CPP)

add_executable(chat chat.cpp)
target_link_libraries(chat ws2_32)
