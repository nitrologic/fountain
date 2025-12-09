cmake_minimum_required(VERSION 3.30)
project(chat LANGUAGES CXX)

# CMake cache entry  CMAKE_CPP_COMPILER needs to point to C:\Program

add_executable(chat chat.cpp)
target_link_libraries(chat ws2_32)
